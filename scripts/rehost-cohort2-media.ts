/**
 * PART A — Re-host cohort-2 Drive-linked media as properly hosted assets.
 *
 * The cohort-2 form originally stored Google Drive *thumbnail* URLs
 * (https://drive.google.com/thumbnail?id=ID&sz=w…). Now that the Drive folder
 * is public we re-fetch each image at full size, verify it is really an image,
 * push it through the existing FFP asset-upload pipeline (lib/asset-upload.ts),
 * and replace the stored Drive URL with the returned GCS URL.
 *
 *   - Brand.ad_statics[]                        (currently Drive thumbnail URLs)
 *   - Student.flea_market_photo / demo_day_photo / convocation_photo
 *
 * Videos[] are intentionally left untouched — Drive video embeds stream via
 * iframe and cannot go through the image pipeline.
 *
 * Idempotent: only Drive URLs are processed. Anything already hosted
 * (storage.googleapis.com, …) or blank is left exactly as-is, so re-runs are
 * safe and a no-op once every asset has been migrated.
 *
 * Run:  npx tsx scripts/rehost-cohort2-media.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import type { Brand as BrandModel } from '../lib/models/Brand'
import type { Student as StudentModel } from '../lib/models/Student'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COHORT = 'cohort-2'

// ── helpers ──────────────────────────────────────────────────────────────────

/** A stored value we should re-host: any Google Drive URL. Already-hosted / blank → false. */
function isDriveUrl(url: string): boolean {
  return typeof url === 'string' && /drive\.google\.com/i.test(url)
}

/** Pull the Drive file id out of any of the URL shapes we've stored. */
function extractDriveId(url: string): string | null {
  if (!url) return null
  const s = url.trim()
  let m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (m) return m[1]
  m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/); if (m) return m[1]
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/); if (m) return m[1]
  return null
}

type RehostResult =
  | { ok: true; url: string }
  | { ok: false; reason: string }

// The asset API rejects anything over 5 MB; keep a margin for multipart overhead.
const MAX_UPLOAD_BYTES = 5_000_000
// Try progressively smaller Drive thumbnail widths so oversized originals still fit.
const SIZE_LADDER = [2000, 1280, 1000, 800]

/**
 * Re-fetch a Drive image (stepping the thumbnail size down until it fits the
 * upload limit), verify content-type image/*, upload via the asset pipeline, and
 * return the new hosted URL. Never throws — failures are returned as
 * { ok:false, reason } so one bad asset can't crash the run.
 */
async function rehostDriveImage(
  storedUrl: string,
  uploadAsset: (file: Buffer, filename: string, contentType?: string) => Promise<string>,
): Promise<RehostResult> {
  const id = extractDriveId(storedUrl)
  if (!id) return { ok: false, reason: 'could not extract Drive file id' }

  let lastReason = 'no size fit under the upload limit'
  for (const sz of SIZE_LADDER) {
    let res: Response
    try {
      res = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w${sz}`, { redirect: 'follow' })
    } catch (e) {
      return { ok: false, reason: `fetch threw: ${(e as Error).message}` }
    }
    if (!res.ok) return { ok: false, reason: `fetch HTTP ${res.status}` }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      return { ok: false, reason: `content-type not image/* (got "${contentType || 'none'}")` }
    }

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return { ok: false, reason: 'empty body' }
    if (buf.length > MAX_UPLOAD_BYTES) {
      lastReason = `too large (${(buf.length / 1024 / 1024).toFixed(1)}MB) even at w${sz}`
      continue // step down to a smaller width
    }

    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    try {
      return { ok: true, url: await uploadAsset(buf, `${COHORT}-${id}.${ext}`, contentType) }
    } catch (e) {
      lastReason = `upload failed: ${(e as Error).message}`
      // If the API still complains about size, try a smaller width; otherwise stop.
      if (/size limit|exceeds/i.test(lastReason)) continue
      return { ok: false, reason: lastReason }
    }
  }
  return { ok: false, reason: lastReason }
}

// ── report shapes ─────────────────────────────────────────────────────────────

type Line = { label: string; oldUrl: string; newUrl?: string; failed?: string }

// ── main ───────────────────────────────────────────────────────────────────────

import { hardenOrExit } from './_guard'

async function main() {
  hardenOrExit('rehost-cohort2-media')
  const { connectDB } = await import('../lib/mongodb')
  const { Brand } = (await import('../lib/models/Brand')) as { Brand: typeof BrandModel }
  const { Student } = (await import('../lib/models/Student')) as { Student: typeof StudentModel }
  const { uploadAsset } = await import('../lib/asset-upload')

  console.log('Connecting to MongoDB…')
  await connectDB()

  const brandLines: Line[] = []
  const studentLines: Line[] = []
  let brandRehosted = 0, brandFailed = 0, brandSkipped = 0
  let studentRehosted = 0, studentFailed = 0, studentSkipped = 0

  // ── Brands: ad_statics[] ──
  const brands = await Brand.find({ cohort: COHORT }).sort({ name: 1 })
  console.log(`\nLoaded ${brands.length} cohort-2 brands.`)

  for (const brand of brands) {
    const current: string[] = Array.isArray(brand.ad_statics) ? [...brand.ad_statics] : []
    let changed = false

    for (let i = 0; i < current.length; i++) {
      const url = current[i]
      if (!isDriveUrl(url)) { brandSkipped++; continue } // already hosted or blank
      console.log(`  [${brand.name}] ad_static #${i + 1}: re-hosting…`)
      const result = await rehostDriveImage(url, uploadAsset)
      if (result.ok) {
        brandLines.push({ label: `${brand.name} · ad_static #${i + 1}`, oldUrl: url, newUrl: result.url })
        current[i] = result.url
        changed = true
        brandRehosted++
      } else {
        brandLines.push({ label: `${brand.name} · ad_static #${i + 1}`, oldUrl: url, failed: result.reason })
        console.log(`    FAILED: ${result.reason}`)
        brandFailed++
      }
    }

    if (changed) {
      await Brand.updateOne({ _id: brand._id }, { $set: { ad_statics: current } })
    }
  }

  // ── Students: flea / demo / convocation photos ──
  const students = await Student.find({ cohort: COHORT }).sort({ name: 1 })
  console.log(`\nLoaded ${students.length} cohort-2 students.`)

  const PHOTO_FIELDS = ['flea_market_photo', 'demo_day_photo', 'convocation_photo'] as const

  for (const student of students) {
    const update: Record<string, string> = {}

    for (const field of PHOTO_FIELDS) {
      const url = (student as unknown as Record<string, string>)[field] || ''
      if (!isDriveUrl(url)) { if (url) studentSkipped++; continue } // hosted → skip; blank → leave (no new link possible)
      console.log(`  [${student.name}] ${field}: re-hosting…`)
      const result = await rehostDriveImage(url, uploadAsset)
      if (result.ok) {
        studentLines.push({ label: `${student.name} · ${field}`, oldUrl: url, newUrl: result.url })
        update[field] = result.url
        studentRehosted++
      } else {
        studentLines.push({ label: `${student.name} · ${field}`, oldUrl: url, failed: result.reason })
        console.log(`    FAILED: ${result.reason}`)
        studentFailed++
      }
    }

    if (Object.keys(update).length > 0) {
      await Student.updateOne({ _id: student._id }, { $set: update })
    }
  }

  // ── Report ──
  const printLines = (title: string, lines: Line[]) => {
    console.log(`\n── ${title} ──────────────────────────────────`)
    if (lines.length === 0) { console.log('  (nothing to re-host)'); return }
    for (const l of lines) {
      if (l.failed) {
        console.log(`  🔴 ${l.label}`)
        console.log(`     OLD:    ${l.oldUrl}`)
        console.log(`     FAILED: ${l.failed}`)
      } else {
        console.log(`  ✅ ${l.label}`)
        console.log(`     OLD: ${l.oldUrl}`)
        console.log(`     NEW: ${l.newUrl}`)
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════')
  console.log('PART A — RE-HOST REPORT')
  console.log('════════════════════════════════════════════════════════')
  printLines('Brand ad_statics', brandLines)
  printLines('Student moment photos', studentLines)

  console.log('\n════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Brand ad_statics   — re-hosted: ${brandRehosted}, failed: ${brandFailed}, skipped(already-hosted): ${brandSkipped}`)
  console.log(`Student photos     — re-hosted: ${studentRehosted}, failed: ${studentFailed}, skipped(already-hosted): ${studentSkipped}`)
  console.log('════════════════════════════════════════════════════════')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
