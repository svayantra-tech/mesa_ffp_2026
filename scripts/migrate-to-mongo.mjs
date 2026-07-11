/**
 * One-shot migration: Supabase (Postgres) -> MongoDB.
 *
 * - Reads `brands`, `students`, `program_media` from Supabase (service role).
 * - Re-hosts image assets through the FFP asset API so nothing depends on
 *   Supabase storage after the cut-over (the new public GCS url is stored).
 * - Writes to the `brands`, `students`, `program_media` collections, preserving
 *   the brand -> student relationship via fresh ObjectIds (students.brand_id).
 *
 * Usage:
 *   node scripts/migrate-to-mongo.mjs            # migrate + re-host images
 *   node scripts/migrate-to-mongo.mjs --no-rehost  # copy urls as-is
 *   node scripts/migrate-to-mongo.mjs --dry-run    # read + re-host, don't write Mongo
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dns from 'node:dns'
import { createClient } from '@supabase/supabase-js'
import { MongoClient, ObjectId } from 'mongodb'
import { hardenOrExit } from './_guard.mjs'
import sharp from 'sharp'

// Optional DNS override (e.g. MIGRATE_DNS=8.8.8.8,1.1.1.1) for environments
// whose default resolver can't resolve Atlas SRV records.
if (process.env.MIGRATE_DNS) dns.setServers(process.env.MIGRATE_DNS.split(','))

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// --- minimal .env.local loader (does not overwrite existing process env) ---
function loadEnv(file) {
  try {
    const raw = readFileSync(join(ROOT, file), 'utf8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim()
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {}
}
loadEnv('.env.local')

const REHOST = !process.argv.includes('--no-rehost')
const DRY_RUN = process.argv.includes('--dry-run')

// ── Safety rail: a bare run (env DRY_RUN default TRUE) never writes ──
hardenOrExit('migrate-to-mongo')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const MONGODB_URI = process.env.MONGODB_URI
const ASSET_UPLOAD_URL =
  process.env.FFP_ASSET_UPLOAD_URL ||
  'https://msl-portal-backend.mesaschool.co.in/api/ffp-asset-upload'

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase env vars')
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

// --- asset re-hosting -------------------------------------------------------
const assetCache = new Map()
const SIZE_LIMIT = 4_800_000 // FFP asset API rejects files over 5 MB

// Downscale/compress oversized images so they fit under the API limit.
async function compressIfNeeded(buf, contentType) {
  if (buf.length <= SIZE_LIMIT) return { buf, contentType }
  const attempts = [
    { width: 1920, quality: 82 },
    { width: 1600, quality: 75 },
    { width: 1280, quality: 70 },
    { width: 1024, quality: 65 },
  ]
  for (const a of attempts) {
    const out = await sharp(buf)
      .rotate() // respect EXIF orientation
      .resize({ width: a.width, withoutEnlargement: true })
      .jpeg({ quality: a.quality, mozjpeg: true })
      .toBuffer()
    if (out.length <= SIZE_LIMIT) {
      console.log(`   ↳ compressed ${(buf.length / 1e6).toFixed(1)}MB -> ${(out.length / 1e6).toFixed(1)}MB`)
      return { buf: out, contentType: 'image/jpeg' }
    }
  }
  // Last resort: smallest attempt even if marginally over.
  const out = await sharp(buf).rotate().resize({ width: 1024 }).jpeg({ quality: 60, mozjpeg: true }).toBuffer()
  return { buf: out, contentType: 'image/jpeg' }
}

async function uploadBytes(buf, filename, contentType) {
  const blob = new Blob([buf], contentType ? { type: contentType } : undefined)
  const form = new FormData()
  form.append('file', blob, filename)
  const res = await fetch(ASSET_UPLOAD_URL, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`asset upload ${res.status}: ${await res.text().catch(() => '')}`)
  return (await res.json()).url
}

// Convert a Google Drive "view" link into a direct-download url so the bytes
// can actually be fetched (mirrors app/api/cert/route.ts).
function driveDirectUrl(url) {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (!m) return null
  return `https://drive.google.com/uc?export=download&confirm=t&id=${m[1]}`
}

async function rehost(url) {
  if (!REHOST || !url || typeof url !== 'string') return url
  if (!/^https?:\/\//i.test(url)) return url
  if (url.includes('storage.googleapis.com/ffp-assets')) return url // already hosted
  // Instagram post links are not directly fetchable as images — leave them.
  if (/instagram\.com/i.test(url)) return url
  if (assetCache.has(url)) return assetCache.get(url)
  try {
    const fetchUrl = url.includes('drive.google.com') ? driveDirectUrl(url) || url : url
    const res = await fetch(fetchUrl, { redirect: 'follow' })
    if (!res.ok) throw new Error(`download ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      assetCache.set(url, url) // not an image (video/html/pdf) — keep original
      return url
    }
    const rawBuf = Buffer.from(await res.arrayBuffer())
    const { buf, contentType } = await compressIfNeeded(rawBuf, ct)
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const base = (url.split('?')[0].split('/').pop() || `asset`).replace(/\.[^.]+$/, '')
    const filename = `${base || 'asset'}.${ext}`
    const newUrl = await uploadBytes(buf, filename, contentType)
    assetCache.set(url, newUrl)
    console.log(`   ↳ rehosted ${base} -> ${newUrl}`)
    return newUrl
  } catch (e) {
    console.warn(`   ! rehost failed for ${url}: ${e.message} (keeping original)`)
    assetCache.set(url, url)
    return url
  }
}

const rehostArray = async (arr) =>
  Array.isArray(arr) ? Promise.all(arr.map((u) => rehost(u))) : []

// Re-host program_media values only when they look like image urls.
const PHOTO_KEY = /(photo|image|img|poster|thumb|asset)/i
async function rehostMediaValue(key, value) {
  if (PHOTO_KEY.test(key)) return rehost(value)
  return value // ids, video ids, etc. left untouched
}

// --- main -------------------------------------------------------------------
async function main() {
  console.log(`Migration starting (rehost=${REHOST}, dryRun=${DRY_RUN})`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  const [{ data: brands, error: bErr }, { data: students, error: sErr }, { data: media, error: mErr }] =
    await Promise.all([
      supabase.from('brands').select('*'),
      supabase.from('students').select('*'),
      supabase.from('program_media').select('*'),
    ])
  if (bErr) throw bErr
  if (sErr) throw sErr
  if (mErr) throw mErr
  console.log(`Fetched: ${brands.length} brands, ${students.length} students, ${media.length} media`)

  // Build Mongo docs, mapping old brand id -> new ObjectId.
  const brandIdMap = new Map() // supabase id -> ObjectId
  const now = new Date()

  const brandDocs = []
  for (const b of brands) {
    const _id = new ObjectId()
    brandIdMap.set(b.id, _id)
    console.log(`Brand: ${b.name} (${b.slug})`)
    brandDocs.push({
      _id,
      slug: b.slug,
      name: b.name,
      description: b.description ?? '',
      revenue: b.revenue ?? 0,
      customers: b.customers ?? 0,
      awards: b.awards ?? [],
      videos: b.videos ?? [], // youtube/instagram — not re-hosted
      ad_statics: await rehostArray(b.ad_statics),
      flea_photos: await rehostArray(b.flea_photos),
      demo_photos: await rehostArray(b.demo_photos),
      website: b.website ?? '',
      instagram: b.instagram ?? '',
      createdAt: now,
      updatedAt: now,
    })
  }

  const studentDocs = students.map((s) => ({
    _id: new ObjectId(),
    slug: s.slug,
    name: s.name,
    email: s.email ?? '',
    certificate_url: s.certificate_url ?? '', // Google Drive pdf — kept as-is
    brand_id: s.brand_id != null ? brandIdMap.get(s.brand_id) ?? null : null,
    createdAt: now,
    updatedAt: now,
  }))

  const mediaDocs = []
  for (const m of media) {
    mediaDocs.push({
      _id: new ObjectId(),
      key: m.key,
      value: await rehostMediaValue(m.key, m.value ?? ''),
      createdAt: now,
      updatedAt: now,
    })
  }

  if (DRY_RUN) {
    console.log('Dry run — skipping Mongo writes.')
    console.log(JSON.stringify({ brandDocs, studentDocs, mediaDocs }, null, 2).slice(0, 2000))
    return
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db() // db name comes from the URI (ffpportfolio)
  console.log(`Connected to Mongo db: ${db.databaseName}`)

  // Fresh load — clear then insert.
  await Promise.all([
    db.collection('brands').deleteMany({}),
    db.collection('students').deleteMany({}),
    db.collection('program_media').deleteMany({}),
  ])

  if (brandDocs.length) await db.collection('brands').insertMany(brandDocs)
  if (studentDocs.length) await db.collection('students').insertMany(studentDocs)
  if (mediaDocs.length) await db.collection('program_media').insertMany(mediaDocs)

  // Indexes (mirror the Mongoose schema definitions).
  await Promise.all([
    db.collection('brands').createIndex({ slug: 1 }, { unique: true }),
    db.collection('students').createIndex({ slug: 1 }, { unique: true }),
    db.collection('students').createIndex({ brand_id: 1 }),
    db.collection('program_media').createIndex({ key: 1 }, { unique: true }),
  ])

  console.log(
    `Inserted: ${brandDocs.length} brands, ${studentDocs.length} students, ${mediaDocs.length} media`
  )
  await client.close()
  console.log('Migration complete.')
}

main().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
