/**
 * Import cohort-2 Convocation Photos (per STUDENT) and Award Photos (per BRAND)
 * from two attached CSVs — no Google API key needed (links are in the CSVs).
 *
 *   convocation_partial_100.csv : Student Name → Drive link  → student.convocation_photo
 *   award_photos_by_brand.csv   : Brand Name   → Drive link  → brand.award_photo
 *
 * Each file is re-hosted through the SAME image pipeline as rehost-cohort2-media.ts
 * (Drive thumbnail → asset-upload → GCS URL, stepping size down under the 5 MB cap).
 * The thumbnail endpoint renders a JPEG even for HEIC sources, so HEIC originals
 * (which the upload API would 415) are handled transparently — no local convert.
 *
 * Idempotent: only fills an EMPTY field; never overwrites an existing value.
 *
 * Run:  npx tsx scripts/import-cohort2-convocation-awards.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { createHash } from 'crypto'
import Papa from 'papaparse'
import type { Brand as BrandModel } from '../lib/models/Brand'
import type { Student as StudentModel } from '../lib/models/Student'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COHORT = 'cohort-2'
const CONVOCATION_CSV = 'convocation_partial_100.csv'
const AWARD_CSV = 'award_photos_by_brand.csv'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Normalize a name: lowercase, non-alphanumerics → single spaces (also strips a
 *  trailing "?" so "Aur Ek" matches the brand "Aur Ek?"). */
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function extractDriveId(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

function readCsv(file: string): Record<string, string>[] {
  const abs = path.resolve(process.cwd(), file)
  if (!fs.existsSync(abs)) throw new Error(`CSV not found: ${abs}`)
  return Papa.parse<Record<string, string>>(fs.readFileSync(abs, 'utf8'), { header: true, skipEmptyLines: true }).data
}

// ── re-host (same proven path as rehost-cohort2-media.ts) ──────────────────────

const MAX_UPLOAD_BYTES = 5_000_000
const SIZE_LADDER = [2000, 1280, 1000, 800]
type RehostResult = { ok: true; url: string } | { ok: false; reason: string }

async function rehostDriveImage(
  id: string,
  uploadAsset: (file: Buffer, filename: string, contentType?: string) => Promise<string>,
): Promise<RehostResult> {
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
      continue
    }
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    try {
      return { ok: true, url: await uploadAsset(buf, `${COHORT}-${id}.${ext}`, contentType) }
    } catch (e) {
      lastReason = `upload failed: ${(e as Error).message}`
      if (/size limit|exceeds/i.test(lastReason)) continue
      return { ok: false, reason: lastReason }
    }
  }
  return { ok: false, reason: lastReason }
}

/** SHA-256 of the raw Drive download, for duplicate detection. null if it can't be fetched. */
async function rawFileHash(id: string): Promise<{ hash: string; size: number } | null> {
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { redirect: 'follow' })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/html')) return null // Drive confirm page (very large file) — skip
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return null
    return { hash: createHash('sha256').update(buf).digest('hex'), size: buf.length }
  } catch {
    return null
  }
}

// ── main ────────────────────────────────────────────────────────────────────────

async function main() {
  const { connectDB } = await import('../lib/mongodb')
  const { Brand } = (await import('../lib/models/Brand')) as { Brand: typeof BrandModel }
  const { Student } = (await import('../lib/models/Student')) as { Student: typeof StudentModel }
  const { uploadAsset } = await import('../lib/asset-upload')

  console.log('Connecting to MongoDB…')
  await connectDB()

  // ════════════════════════ PART A — CONVOCATION (per student) ════════════════════════
  console.log('\n════════════════════════════════════════════════════════')
  console.log('PART A — CONVOCATION PHOTOS (per student)')
  console.log('════════════════════════════════════════════════════════')

  const students = await Student.find({ cohort: COHORT }, 'name slug convocation_photo').lean()
  const studentByFull = new Map<string, typeof students>()
  for (const s of students) {
    const k = normName(s.name as string)
    ;(studentByFull.get(k) ?? studentByFull.set(k, []).get(k)!).push(s)
  }

  const convRows = readCsv(CONVOCATION_CSV)
  console.log(`Loaded ${convRows.length} rows from ${CONVOCATION_CSV}.`)

  const convMatched: string[] = []
  const convUnmatched: string[] = []
  const convSkipped: string[] = []
  const convFailed: string[] = []

  for (const row of convRows) {
    const name = (row['Student Name'] || '').trim()
    const link = (row['Convocation Photo Drive Link'] || '').trim()
    if (!name) continue
    const hits = studentByFull.get(normName(name)) ?? []
    if (hits.length !== 1) { convUnmatched.push(`${name}${hits.length > 1 ? ' (AMBIGUOUS)' : ''}`); continue }
    const student = hits[0]
    if ((student as unknown as Record<string, string>).convocation_photo) { convSkipped.push(student.name as string); continue }
    const id = extractDriveId(link)
    if (!id) { convFailed.push(`${name}: bad link`); continue }
    const result = await rehostDriveImage(id, uploadAsset)
    if (!result.ok) { convFailed.push(`${name}: ${result.reason}`); continue }
    await Student.updateOne({ _id: (student as { _id: unknown })._id }, { $set: { convocation_photo: result.url } })
    ;(student as unknown as Record<string, string>).convocation_photo = result.url
    convMatched.push(`${name} → ${result.url}`)
  }

  console.log(`\n✅ Matched & set (${convMatched.length}):`)
  for (const m of convMatched) console.log(`  ${m}`)
  console.log(`\n⏭️  Skipped (already had convocation_photo) — ${convSkipped.length}`)
  for (const s of convSkipped) console.log(`  ${s}`)
  console.log(`\n❓ UNMATCHED (no exact student) — ${convUnmatched.length}:`)
  for (const u of convUnmatched) console.log(`  "${u}"`)
  if (convFailed.length) { console.log(`\n🔴 FAILED — ${convFailed.length}:`); for (const f of convFailed) console.log(`  ${f}`) }

  const stillMissing = await Student.find({ cohort: COHORT, $or: [{ convocation_photo: '' }, { convocation_photo: { $exists: false } }] }, 'name slug').lean()
  // $gt:'' counts non-empty strings only (excludes '' AND missing fields — unlike $ne:'').
  const convCount = await Student.countDocuments({ cohort: COHORT, convocation_photo: { $gt: '' } })
  console.log(`\nconvocation_photo populated: ${convCount} / ${students.length}`)
  console.log(`STILL MISSING convocation (${stillMissing.length}):`)
  for (const s of stillMissing) console.log(`  ${s.name} (${s.slug})`)

  // ════════════════════════ PART B — AWARD PHOTOS (per brand) ════════════════════════
  console.log('\n════════════════════════════════════════════════════════')
  console.log('PART B — AWARD PHOTOS (per brand)')
  console.log('════════════════════════════════════════════════════════')

  const brands = await Brand.find({ cohort: COHORT }, 'name slug award_photo').lean()
  const brandByName = new Map<string, typeof brands>()
  for (const b of brands) {
    const k = normName(b.name as string)
    ;(brandByName.get(k) ?? brandByName.set(k, []).get(k)!).push(b)
  }

  const awardRows = readCsv(AWARD_CSV)
  console.log(`Loaded ${awardRows.length} rows from ${AWARD_CSV}.`)

  const awMatched: string[] = []
  const awUnmatched: string[] = []
  const awSkipped: string[] = []
  const awFailed: string[] = []
  const awDuplicate: string[] = []
  const seenHash = new Map<string, string>() // hash → brand already given this exact image

  for (const row of awardRows) {
    const brandName = (row['Brand Name'] || '').trim()
    const link = (row['Award Photo Drive Link'] || '').trim()
    const note = (row['Notes'] || '').trim()
    if (!brandName) continue
    const hits = brandByName.get(normName(brandName)) ?? []
    if (hits.length !== 1) { awUnmatched.push(`${brandName}${hits.length > 1 ? ' (AMBIGUOUS)' : ''}`); continue }
    const brand = hits[0]
    if ((brand as unknown as Record<string, string>).award_photo) { awSkipped.push(brand.name as string); continue }
    const id = extractDriveId(link)
    if (!id) { awFailed.push(`${brandName}: bad link`); continue }

    // Duplicate detection (byte-identical source image, e.g. the KAZI/RefleKt HEIC pair).
    const raw = await rawFileHash(id)
    if (raw && seenHash.has(raw.hash)) {
      awDuplicate.push(`${brandName} — identical image (sha256 ${raw.hash.slice(0, 12)}…, ${raw.size}B) to "${seenHash.get(raw.hash)}"; NOT stored${note ? ` [note: ${note}]` : ''}`)
      continue
    }

    const result = await rehostDriveImage(id, uploadAsset)
    if (!result.ok) { awFailed.push(`${brandName}: ${result.reason}${note ? ` [note: ${note}]` : ''}`); continue }
    if (raw) seenHash.set(raw.hash, brand.name as string)
    await Brand.updateOne({ _id: (brand as { _id: unknown })._id }, { $set: { award_photo: result.url } })
    ;(brand as unknown as Record<string, string>).award_photo = result.url
    awMatched.push(`${brandName} → ${result.url}`)
  }

  console.log(`\n✅ Matched & set (${awMatched.length}):`)
  for (const m of awMatched) console.log(`  ${m}`)
  console.log(`\n⏭️  Skipped (already had award_photo) — ${awSkipped.length}`)
  for (const s of awSkipped) console.log(`  ${s}`)
  console.log(`\n🔁 DUPLICATE (identical to another brand's image, not stored) — ${awDuplicate.length}:`)
  for (const d of awDuplicate) console.log(`  ${d}`)
  console.log(`\n❓ UNMATCHED (no exact brand) — ${awUnmatched.length}:`)
  for (const u of awUnmatched) console.log(`  "${u}"`)
  if (awFailed.length) { console.log(`\n🔴 FAILED — ${awFailed.length}:`); for (const f of awFailed) console.log(`  ${f}`) }

  // $gt:'' — count only brands with a real value (existing brand docs may lack the
  // freshly-added award_photo field entirely, which $ne:'' would wrongly count).
  const awCount = await Brand.countDocuments({ cohort: COHORT, award_photo: { $gt: '' } })
  console.log(`\naward_photo populated: ${awCount} / ${brands.length} brands`)

  console.log('\n════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Convocation — matched: ${convMatched.length}, skipped: ${convSkipped.length}, unmatched: ${convUnmatched.length}, failed: ${convFailed.length} → ${convCount}/${students.length} students`)
  console.log(`Award       — matched: ${awMatched.length}, skipped: ${awSkipped.length}, duplicate: ${awDuplicate.length}, unmatched: ${awUnmatched.length}, failed: ${awFailed.length} → ${awCount}/${brands.length} brands`)
  console.log('════════════════════════════════════════════════════════')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
