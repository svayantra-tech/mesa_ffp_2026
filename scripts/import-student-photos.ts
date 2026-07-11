/**
 * One-off: pull the published FFP Google Sheet and populate each student's
 * flea_market_photo, demo_day_photo, and convocation_photo from their own row.
 *
 * Run:  npx tsx scripts/import-student-photos.ts
 */

import 'dotenv/config'
import Papa from 'papaparse'
import { connectDB } from '../lib/mongodb'
import { Student } from '../lib/models/Student'
import { normalizeImageUrl } from '../lib/normalize'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhvHnz3tPIoWfwngMQZOlVMUAJXxKUvAX48KGXw2jXONW3yqHdj7MmiThiXtzsZ-9QHjfXEMB8fh7k/pub?output=csv'

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Return the header key whose lower-cased trimmed form matches `needle`. */
function findHeader(headers: string[], needle: string): string | undefined {
  return headers.find((h) => h.toLowerCase().trim() === needle)
}

/** HEAD or GET the URL; return { ok, contentType } */
async function probeUrl(url: string): Promise<{ ok: boolean; contentType: string }> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    const ct = res.headers.get('content-type') ?? ''
    return { ok: res.ok && ct.startsWith('image/'), contentType: ct }
  } catch {
    return { ok: false, contentType: '' }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

import { hardenOrExit } from './_guard'

async function main() {
  hardenOrExit('import-student-photos')
  // 1. Fetch CSV
  console.log('Fetching sheet CSV…')
  const csvText = await fetch(SHEET_CSV_URL).then((r) => {
    if (!r.ok) throw new Error(`Sheet fetch failed: ${r.status}`)
    return r.text()
  })

  // 2. Parse
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  const rows = parsed.data
  const headers = parsed.meta.fields ?? []

  console.log('\n── Detected headers ──────────────────────────────────')
  console.log(headers.join(' | '))

  // 3. Resolve column mapping
  const COL_MAP: Record<string, string> = {
    name: findHeader(headers, 'student name') ?? '',
    flea_market_photo: findHeader(headers, 'flea market photo') ?? '',
    demo_day_photo: findHeader(headers, 'demo day photo') ?? '',
    convocation_photo: findHeader(headers, 'photo from convocation') ?? '',
  }

  console.log('\n── Column mapping ────────────────────────────────────')
  for (const [field, col] of Object.entries(COL_MAP)) {
    console.log(`  ${field.padEnd(22)} ← "${col || '(NOT FOUND)'}"`)
  }

  if (!COL_MAP.name) {
    throw new Error(
      'Cannot find a "Student Name" column in the sheet. Aborting.\nHeaders: ' +
        headers.join(', ')
    )
  }

  // 4. Connect to DB and load all students
  console.log('\nConnecting to MongoDB…')
  await connectDB()
  const allStudents = await Student.find({}, 'slug name flea_market_photo demo_day_photo convocation_photo').lean()
  console.log(`  Loaded ${allStudents.length} students from DB.`)

  const slugMap = new Map(allStudents.map((s) => [s.slug, s]))
  const nameMap = new Map(allStudents.map((s) => [normName(s.name as string), s]))

  // 5. Process rows
  type BrokenEntry = { student: string; field: string; url: string; status: string }

  const updated: Array<{ name: string; fields: string[] }> = []
  const unmatched: string[] = []
  const allBlank: string[] = []
  const broken: BrokenEntry[] = []

  for (const row of rows) {
    const rawName = (row[COL_MAP.name] ?? '').trim()
    if (!rawName) continue

    // Match student
    let student = slugMap.get(slugify(rawName)) ?? nameMap.get(normName(rawName)) ?? null

    // Check for ambiguity (multiple slug hits — edge case, but check name map)
    if (!student) {
      unmatched.push(rawName)
      continue
    }

    // Collect the three photo cells
    const cells: Array<{ field: 'flea_market_photo' | 'demo_day_photo' | 'convocation_photo'; col: string }> = [
      { field: 'flea_market_photo', col: COL_MAP.flea_market_photo },
      { field: 'demo_day_photo', col: COL_MAP.demo_day_photo },
      { field: 'convocation_photo', col: COL_MAP.convocation_photo },
    ]

    const photoUpdates: Record<string, string> = {}
    let anyNonEmpty = false

    for (const { field, col } of cells) {
      if (!col) continue
      const raw = (row[col] ?? '').trim()
      if (!raw) continue

      // Don't overwrite existing non-empty value with blank — already guarded above (raw is non-empty here)
      const existing = (student as Record<string, unknown>)[field] as string | undefined
      if (existing) {
        // Already has a value — skip (idempotent: don't wipe with same or different value arbitrarily)
        // Actually spec says NEVER overwrite existing non-empty with blank — but if sheet has a value
        // and DB also has one, we update (sheet is authoritative for this run).
        // Re-reading spec: "NEVER overwrite an existing non-empty value with a blank cell" — raw is
        // non-empty here so we always write.
      }

      anyNonEmpty = true
      const normalized = normalizeImageUrl(raw)

      // Probe
      console.log(`  Probing [${rawName}] ${field}: ${normalized.slice(0, 80)}…`)
      const probe = await probeUrl(normalized)
      if (!probe.ok) {
        broken.push({
          student: rawName,
          field,
          url: normalized,
          status: `content-type="${probe.contentType || 'error'}"`,
        })
      }

      photoUpdates[field] = normalized
    }

    if (!anyNonEmpty) {
      allBlank.push(rawName)
      continue
    }

    if (Object.keys(photoUpdates).length > 0) {
      await Student.updateOne({ _id: (student as Record<string, unknown>)._id }, { $set: photoUpdates })
      updated.push({ name: rawName, fields: Object.keys(photoUpdates) })
    }
  }

  // 6. Report
  console.log('\n════════════════════════════════════════════════════════')
  console.log('IMPORT REPORT')
  console.log('════════════════════════════════════════════════════════')

  console.log(`\n✅ Students updated (${updated.length}):`)
  if (updated.length === 0) console.log('  (none)')
  for (const u of updated) {
    console.log(`  ${u.name} → ${u.fields.join(', ')}`)
  }

  console.log(`\n⚠️  Rows with no matching DB student (${unmatched.length}):`)
  if (unmatched.length === 0) console.log('  (none)')
  for (const n of unmatched) console.log(`  "${n}"`)

  console.log(`\nℹ️  Matched rows where all 3 photo cells were blank (${allBlank.length}):`)
  if (allBlank.length === 0) console.log('  (none)')
  for (const n of allBlank) console.log(`  "${n}"`)

  console.log(`\n🔴 Broken/unreachable photo URLs (${broken.length}):`)
  if (broken.length === 0) console.log('  (none)')
  for (const b of broken) {
    console.log(`  ${b.student} | ${b.field}`)
    console.log(`    ${b.url}`)
    console.log(`    ${b.status}`)
  }

  console.log('\n════════════════════════════════════════════════════════')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
