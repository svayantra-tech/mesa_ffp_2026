/**
 * PARTS B & C — populate two new cohort-2 student fields from the published sheet.
 *
 *   B. personal_growth  ← "Personal Growth Learnings (Member 1..4)" columns
 *   C. award_photo       ← "Photos of Awards won" column (re-hosted if a Drive URL)
 *
 * DATA SHAPE (post student-import fix):
 *   Every team member is now its own student row. But the reflections are messy:
 *   a team's four "(Member N)" reflection cells are frequently ALL dumped onto the
 *   team's first (header) row, each prefixed with the member's own name
 *   ("Aarav Mishra- I learned…"), while the members' own rows are blank. So we can't
 *   just read each student's own row.
 *
 *   Instead we DISTRIBUTE, per team: collect every reflection cell across all the
 *   team's rows, and assign each to the member named in its leading label (strip the
 *   label). An unlabeled cell belongs to the student whose row it sits on. This gives
 *   each member their own words regardless of which row/column they landed in, and
 *   never attributes a teammate's reflection to the wrong person.
 *
 * Idempotent: always overwrites personal_growth with the latest derived value (so
 * sheet edits propagate); award photos already hosted on GCS are not re-fetched.
 *
 * Run:  npx tsx scripts/import-cohort2-growth-awards.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import Papa from 'papaparse'
import type { Brand as BrandModel } from '../lib/models/Brand'
import type { Student as StudentModel } from '../lib/models/Student'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COHORT = 'cohort-2'
const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRoBEfBSb0uAukxy0x8Kb1HVhs1D-fc6xp3W_9XGVBuNJ48S9i7jVpkrroACR-AIazg58sy7bKTrEt3/pub?output=csv'

// ── name / slug helpers (mirror import-cohort2.ts) ─────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}
function normName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}
function normalizeHeader(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}
function findHeader(headers: string[], needle: string): string | undefined {
  const t = normalizeHeader(needle)
  return headers.find((h) => normalizeHeader(h) === t)
}
function findHeaderContains(headers: string[], needle: string): string | undefined {
  const t = normalizeHeader(needle)
  return headers.find((h) => normalizeHeader(h).includes(t))
}
function cell(row: Record<string, string>, col: string | undefined): string {
  if (!col) return ''
  return (row[col] ?? '').trim()
}

// ── Part B: reflection extraction ──────────────────────────────────────────────

/** Detect a leading "Label <sep> rest" prefix (sep ∈ - = – : ,), optional (me). */
function nameLead(text: string): { name: string; rest: string } | null {
  const m = text.match(/^\s*([A-Za-z][A-Za-z., ]{0,44}?)\s*(?:\([^)]*\))?\s*[-=–:,]+\s*([\s\S]+)$/)
  if (!m) return null
  return { name: normName(m[1]), rest: m[2].trim() }
}

/** Cells that are technically non-empty but carry no real reflection. */
function isJunk(text: string): boolean {
  const trimmed = text.trim()
  const compact = trimmed.toLowerCase().replace(/[.\s]/g, '')
  if (compact === '' || compact === 'na' || compact === 'none' || compact === 'nil' || trimmed.length < 4) return true
  // Placeholder phrases submitters typed when they had nothing to say.
  return /^(n\/?a|not\s+(able\s+to\s+find|found|available|applicable|yet|sure|done)|tbd|to\s+be\s+(added|updated|filled)|will\s+update|no\s+(response|reply|reflection)|-+)$/i.test(trimmed)
}

/** First-name-or-fuller match between a label and a student name. */
function labelMatchesName(label: string, studentName: string): boolean {
  const l = normName(label)
  const s = normName(studentName)
  if (!l || !s) return false
  const lf = l.split(' ')[0]
  const sf = s.split(' ')[0]
  return l === s || l.startsWith(s) || s.startsWith(l) || lf === sf
}

// ── Part C: award photo helpers ────────────────────────────────────────────────

function extractDriveId(url: string): string | null {
  if (!url) return null
  const s = url.trim()
  let m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (m) return m[1]
  m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/); if (m) return m[1]
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/); if (m) return m[1]
  m = s.match(/open\?id=([a-zA-Z0-9_-]+)/); if (m) return m[1]
  return null
}

type RehostResult = { ok: true; url: string } | { ok: false; reason: string }

const MAX_UPLOAD_BYTES = 5_000_000
const SIZE_LADDER = [2000, 1280, 1000, 800]

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
      return { ok: true, url: await uploadAsset(buf, `${COHORT}-award-${id}.${ext}`, contentType) }
    } catch (e) {
      lastReason = `upload failed: ${(e as Error).message}`
      if (/size limit|exceeds/i.test(lastReason)) continue
      return { ok: false, reason: lastReason }
    }
  }
  return { ok: false, reason: lastReason }
}

// ── main ────────────────────────────────────────────────────────────────────────

type StudentLite = { _id: string; name: string; slug: string; brandId: string; award_photo: string }

async function main() {
  const { connectDB } = await import('../lib/mongodb')
  const { Brand } = (await import('../lib/models/Brand')) as { Brand: typeof BrandModel }
  const { Student } = (await import('../lib/models/Student')) as { Student: typeof StudentModel }
  const { uploadAsset } = await import('../lib/asset-upload')

  console.log('Fetching sheet CSV…')
  const csvText = await fetch(SHEET_CSV_URL).then((r) => {
    if (!r.ok) throw new Error(`Sheet fetch failed: ${r.status}`)
    return r.text()
  })
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  const rows = parsed.data
  const headers = parsed.meta.fields ?? []

  const COL = {
    team: findHeader(headers, 'Team Name'),
    names: findHeader(headers, 'Names'),
    pg1: findHeaderContains(headers, 'Personal Growth Learnings (Member 1)'),
    pg2: findHeaderContains(headers, 'Personal Growth Learnings (Member 2)'),
    pg3: findHeaderContains(headers, 'Personal Growth Learnings (Member 3)'),
    pg4: findHeaderContains(headers, 'Personal Growth Learnings (Member 4)'),
    awardPhoto: findHeader(headers, 'Photos of Awards won'),
  }
  console.log('\n── Column mapping ────────────────────────────────────')
  for (const [k, v] of Object.entries(COL)) console.log(`  ${k.padEnd(12)} ← "${v ?? '(NOT FOUND)'}"`)
  if (!COL.team || !COL.names || !COL.pg1) throw new Error('Required columns not found. Aborting.')
  const PG_COLS = [COL.pg1, COL.pg2, COL.pg3, COL.pg4]

  console.log('\nConnecting to MongoDB…')
  await connectDB()
  const brands = await Brand.find({ cohort: COHORT }, 'slug').lean()
  const brandIdBySlug = new Map(brands.map((b) => [b.slug as string, String(b._id)]))
  const studentDocs = await Student.find({ cohort: COHORT }, 'name slug brand_id award_photo').lean()
  const students: StudentLite[] = studentDocs.map((s) => ({
    _id: String(s._id), name: (s.name as string) ?? '', slug: (s.slug as string) ?? '',
    brandId: String(s.brand_id), award_photo: (s as unknown as Record<string, string>).award_photo ?? '',
  }))
  console.log(`  Loaded ${students.length} cohort-2 students across ${brands.length} brands.`)

  // Members grouped by brand, for name-label distribution.
  const membersByBrand = new Map<string, StudentLite[]>()
  for (const s of students) {
    if (!membersByBrand.has(s.brandId)) membersByBrand.set(s.brandId, [])
    membersByBrand.get(s.brandId)!.push(s)
  }

  // Forward-fill the merged Team Name, then group rows per brand.
  const rowsByBrand = new Map<string, Record<string, string>[]>()
  let currentTeam = ''
  for (const row of rows) {
    const tc = cell(row, COL.team)
    if (tc) currentTeam = tc
    if (!currentTeam) continue
    const brandId = brandIdBySlug.get(slugify(currentTeam))
    if (!brandId) continue
    if (!rowsByBrand.has(brandId)) rowsByBrand.set(brandId, [])
    rowsByBrand.get(brandId)!.push(row)
  }

  // ── Part B: distribute reflections within each team ──
  // assignment per studentId: prefer a self-labeled reflection (priority 2) over an
  // unlabeled own-row reflection (priority 1).
  const growth = new Map<string, { text: string; priority: number; source: string }>()
  const consider = (sid: string, text: string, priority: number, source: string) => {
    if (isJunk(text)) return
    const prev = growth.get(sid)
    if (!prev || priority > prev.priority) growth.set(sid, { text: text.trim(), priority, source })
  }

  for (const [brandId, teamRows] of rowsByBrand) {
    const members = membersByBrand.get(brandId) ?? []
    for (const row of teamRows) {
      const rowOwner = members.find((m) => normName(m.name) === normName(cell(row, COL.names)))
      for (const col of PG_COLS) {
        const raw = cell(row, col)
        if (!raw) continue
        const lead = nameLead(raw)
        if (lead) {
          // Assign to the team member the label names; strip the label.
          const target = members.find((m) => labelMatchesName(lead.name, m.name))
          if (target) consider(target._id, lead.rest, 2, `labeled "${lead.name}"`)
          else if (rowOwner && labelMatchesName(lead.name, rowOwner.name)) consider(rowOwner._id, lead.rest, 2, 'self-label')
          // a label naming a non-member (e.g. a member who never got a student row) is dropped
        } else if (rowOwner) {
          // Unlabeled free text → belongs to the student whose row this is.
          consider(rowOwner._id, raw, 1, 'own-row unlabeled')
        }
      }
    }
  }

  // ── Part C: award photo per row ──
  type AwardLine = { name: string; oldUrl: string; newUrl?: string; failed?: string }
  const awardLines: AwardLine[] = []
  let awardHosted = 0, awardFailed = 0, awardBare = 0
  const awardByStudent = new Map<string, string>()

  for (const [brandId, teamRows] of rowsByBrand) {
    const members = membersByBrand.get(brandId) ?? []
    for (const row of teamRows) {
      const raw = cell(row, COL.awardPhoto)
      if (!raw) continue
      const owner = members.find((m) => normName(m.name) === normName(cell(row, COL.names)))
      if (!owner) continue
      const driveId = extractDriveId(raw)
      if (!driveId) { awardBare++; continue } // bare filename — no link to fetch
      if (/storage\.googleapis\.com/.test(owner.award_photo)) {
        awardLines.push({ name: owner.name, oldUrl: raw, newUrl: owner.award_photo })
        continue // already hosted (idempotent)
      }
      const result = await rehostDriveImage(driveId, uploadAsset)
      if (result.ok) {
        awardByStudent.set(owner._id, result.url)
        awardHosted++
        awardLines.push({ name: owner.name, oldUrl: raw, newUrl: result.url })
      } else {
        awardFailed++
        awardLines.push({ name: owner.name, oldUrl: raw, failed: result.reason })
        console.log(`  🔴 [${owner.name}] award photo FAILED: ${result.reason}`)
      }
    }
  }

  // ── Write updates ──
  let growthWritten = 0, growthCleared = 0
  for (const s of students) {
    const update: Record<string, string> = {}
    const g = growth.get(s._id)
    update.personal_growth = g ? g.text : '' // idempotent overwrite (clears stale)
    if (g) growthWritten++; else growthCleared++
    if (awardByStudent.has(s._id)) update.award_photo = awardByStudent.get(s._id)!
    await Student.updateOne({ _id: s._id }, { $set: update })
  }

  // ── Report ──
  const got = students.filter((s) => growth.has(s._id))
  console.log('\n════════════════════════════════════════════════════════')
  console.log('PART B — PERSONAL GROWTH')
  console.log('════════════════════════════════════════════════════════')
  console.log(`\n✅ Students given a reflection (${got.length} of ${students.length}):`)
  for (const s of got) {
    const g = growth.get(s._id)!
    console.log(`  ${s.name} [${g.source}]  "${g.text.slice(0, 90)}${g.text.length > 90 ? '…' : ''}"`)
  }
  console.log('\n── 3 sample cleaned entries ──────────────────────────')
  for (const s of got.slice(0, 3)) {
    console.log(`\n  • ${s.name}:\n    ${growth.get(s._id)!.text}`)
  }

  console.log('\n════════════════════════════════════════════════════════')
  console.log('PART C — AWARD PHOTOS')
  console.log('════════════════════════════════════════════════════════')
  for (const a of awardLines) {
    if (a.failed) console.log(`  🔴 ${a.name}\n     OLD: ${a.oldUrl}\n     FAILED: ${a.failed}`)
    else console.log(`  ✅ ${a.name}\n     OLD: ${a.oldUrl}\n     NEW: ${a.newUrl}`)
  }

  console.log('\n════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Personal growth — populated: ${growthWritten}, blank: ${growthCleared}`)
  console.log(`Award photos    — hosted: ${awardHosted}, failed: ${awardFailed}, bare-filename(skipped): ${awardBare}`)
  console.log('════════════════════════════════════════════════════════')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
