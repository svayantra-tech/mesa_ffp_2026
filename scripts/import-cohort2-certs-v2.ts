/**
 * Match certificate Drive links (from FFP_Certificate_Links CSV) to cohort-2
 * students by name and set each student's certificate_url. No Google API key
 * needed — the CSV already carries a direct Drive link per student.
 *
 * CSV columns: S.No, Student Name, Certificate Drive Link
 * Default path: "FFP_Certificate_Links - Certificate Links.csv" (override: argv[2])
 *
 * Matching (priority; never guess — report anything uncertain):
 *   1. Exact full-name match (normalized: lowercase, punctuation → space, collapse).
 *   2. Single-word CSV name → match on cohort-2 first names. Exactly one → use it;
 *      2+ candidates → AMBIGUOUS (skip, list candidates).
 *   3. Otherwise → UNMATCHED (skip, list the row).
 *
 * Idempotent: only fills an EMPTY certificate_url; never overwrites an existing one.
 * Stores https://drive.google.com/file/d/FILE_ID/view — the shape the cert viewer
 * (app/[slug]/CertificateViewer.tsx) already parses.
 *
 * Run:  npx tsx scripts/import-cohort2-certs-v2.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import Papa from 'papaparse'
import type { Student as StudentModel } from '../lib/models/Student'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COHORT = 'cohort-2'
const CSV_PATH = process.argv[2] || 'FFP_Certificate_Links - Certificate Links.csv'

/** Normalize a name: lowercase, non-alphanumerics → single spaces, trimmed. */
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

/** Extract the Drive file id (same shapes the cert viewer understands). */
function extractDriveId(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

import { hardenOrExit } from './_guard'

async function main() {
  hardenOrExit('import-cohort2-certs-v2')
  const abs = path.resolve(process.cwd(), CSV_PATH)
  if (!fs.existsSync(abs)) throw new Error(`CSV not found: ${abs}`)
  const parsed = Papa.parse<Record<string, string>>(fs.readFileSync(abs, 'utf8'), { header: true, skipEmptyLines: true })
  const rows = parsed.data
  const headers = parsed.meta.fields ?? []
  const nameCol = headers.find((h) => /student name/i.test(h)) ?? 'Student Name'
  const linkCol = headers.find((h) => /link/i.test(h)) ?? 'Certificate Drive Link'
  console.log(`Loaded ${rows.length} CSV rows from "${CSV_PATH}" (name="${nameCol}", link="${linkCol}").`)

  const { connectDB } = await import('../lib/mongodb')
  const { Student } = (await import('../lib/models/Student')) as { Student: typeof StudentModel }
  console.log('Connecting to MongoDB…')
  await connectDB()
  const students = await Student.find({ cohort: COHORT }, 'name slug certificate_url').lean()
  console.log(`  Loaded ${students.length} cohort-2 students.`)

  // Full-name index and first-name index.
  const byFull = new Map<string, typeof students>()
  const byFirst = new Map<string, typeof students>()
  for (const s of students) {
    const full = normName(s.name as string)
    const first = full.split(' ')[0]
    ;(byFull.get(full) ?? byFull.set(full, []).get(full)!).push(s)
    ;(byFirst.get(first) ?? byFirst.set(first, []).get(first)!).push(s)
  }

  type Row = { csvName: string; student?: string; slug?: string; candidates?: string[] }
  const matchedExact: Row[] = []
  const matchedFirst: Row[] = []
  const ambiguous: Row[] = []
  const unmatched: Row[] = []
  const skipped: Row[] = []
  const badLink: Row[] = []

  for (const row of rows) {
    const csvName = (row[nameCol] ?? '').trim()
    const link = (row[linkCol] ?? '').trim()
    if (!csvName) continue
    const fileId = extractDriveId(link)
    if (!fileId) { badLink.push({ csvName }); continue }
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`

    const norm = normName(csvName)
    const fullHits = byFull.get(norm) ?? []

    // 1. Exact full-name match (must be unambiguous).
    if (fullHits.length === 1) {
      const s = fullHits[0]
      const bucket = (await applyCert(Student, s, viewUrl)) ? matchedExact : skipped
      bucket.push({ csvName, student: s.name as string, slug: s.slug as string })
      continue
    }
    if (fullHits.length > 1) {
      ambiguous.push({ csvName, candidates: fullHits.map((s) => `${s.name} (${s.slug})`) })
      continue
    }

    // 2. Single-word CSV name → match on first names.
    if (!norm.includes(' ')) {
      const firstHits = byFirst.get(norm) ?? []
      if (firstHits.length === 1) {
        const s = firstHits[0]
        const bucket = (await applyCert(Student, s, viewUrl)) ? matchedFirst : skipped
        bucket.push({ csvName, student: s.name as string, slug: s.slug as string })
      } else if (firstHits.length > 1) {
        ambiguous.push({ csvName, candidates: firstHits.map((s) => `${s.name} (${s.slug})`) })
      } else {
        unmatched.push({ csvName })
      }
      continue
    }

    // 3. Multi-word, no exact match → do not guess.
    unmatched.push({ csvName })
  }

  // ── Report ──
  console.log('\n════════════════════════════════════════════════════════')
  console.log('CERTIFICATE IMPORT (CSV) REPORT')
  console.log('════════════════════════════════════════════════════════')

  console.log(`\n✅ Matched (exact full name) — ${matchedExact.length}:`)
  for (const m of matchedExact) console.log(`  ${m.csvName}  →  ${m.student}  (${m.slug})`)

  console.log(`\n✅ Matched (single-word first name, unambiguous) — ${matchedFirst.length}  [spot-check these]:`)
  for (const m of matchedFirst) console.log(`  "${m.csvName}"  →  ${m.student}  (${m.slug})`)

  console.log(`\n⚠️  AMBIGUOUS (name matches 2+ students — resolve manually) — ${ambiguous.length}:`)
  for (const a of ambiguous) console.log(`  "${a.csvName}"  →  ${a.candidates!.join('  |  ')}`)

  console.log(`\n❓ UNMATCHED (no cohort-2 student found) — ${unmatched.length}:`)
  for (const u of unmatched) console.log(`  "${u.csvName}"`)

  console.log(`\n⏭️  Skipped (already had a certificate) — ${skipped.length}:`)
  for (const s of skipped) console.log(`  ${s.student} (${s.slug})`)

  if (badLink.length) {
    console.log(`\n🔴 Rows with an unparseable Drive link — ${badLink.length}:`)
    for (const b of badLink) console.log(`  "${b.csvName}"`)
  }

  const withCert = await Student.countDocuments({ cohort: COHORT, certificate_url: { $ne: '' } })
  console.log('\n════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Matched exact:            ${matchedExact.length}`)
  console.log(`Matched first-name:       ${matchedFirst.length}`)
  console.log(`Ambiguous (skipped):      ${ambiguous.length}`)
  console.log(`Unmatched (skipped):      ${unmatched.length}`)
  console.log(`Already had cert:         ${skipped.length}`)
  console.log(`Students with cert now:   ${withCert} / ${students.length}`)
  console.log(`Still missing a cert:     ${students.length - withCert}`)
  console.log('════════════════════════════════════════════════════════')

  process.exit(0)
}

/** Set certificate_url only if currently empty. Returns true if written, false if skipped. */
async function applyCert(
  Student: typeof StudentModel,
  student: { _id: unknown; certificate_url?: unknown },
  viewUrl: string,
): Promise<boolean> {
  if (student.certificate_url) return false
  await Student.updateOne({ _id: student._id }, { $set: { certificate_url: viewUrl } })
  student.certificate_url = viewUrl // guard against a duplicate CSV row within this run
  return true
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
