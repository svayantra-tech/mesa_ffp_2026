/**
 * Match certificate files in a Google Drive folder to cohort-2 students by name
 * and set each student's certificate_url.
 *
 * FOLDER: "FFP Certificates C-2"
 *   https://drive.google.com/drive/folders/15gBe7iP5ZeCrODoLH-ZiQjippbIaM0YS
 *
 * Listing a folder's contents needs the Drive API (a public link-share is enough
 * — no OAuth). Provide a key via GOOGLE_API_KEY (or GOOGLE_DRIVE_API_KEY) in
 * .env.local. To create one:
 *   console.cloud.google.com → select/create a project → enable "Google Drive API"
 *   → Credentials → Create API key → restrict it to the Drive API → paste it in as
 *   GOOGLE_API_KEY. Then re-run. (We do NOT fall back to HTML scraping.)
 *
 * Idempotent: only fills an EMPTY certificate_url; never overwrites an existing one.
 *
 * Run:  npx tsx scripts/import-cohort2-certs.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import type { Student as StudentModel } from '../lib/models/Student'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COHORT = 'cohort-2'
const FOLDER_ID = '15gBe7iP5ZeCrODoLH-ZiQjippbIaM0YS'
const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY || ''

// ── name helpers (match the codebase) ──────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}
/** lowercase + strip everything non-alphanumeric — for tolerant full-name compares. */
function normAlnum(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Turn a certificate filename into a candidate student name. */
function candidateFromFilename(filename: string): string {
  let s = filename.replace(/\.[a-z0-9]+$/i, '') // strip extension
  s = s.replace(/[_-]+/g, ' ') // underscores / hyphens → spaces
  // Drop template/junk tokens that aren't part of a person's name.
  s = s.replace(/\b(certificate|certificates|cert|ffp|future\s*founder(?:s)?(?:\s*program)?|c-?2|cohort\s*-?\s*2|cohort2|mesa|2026)\b/gi, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

// ── Drive listing ──────────────────────────────────────────────────────────────

type DriveFile = { id: string; name: string; mimeType: string }

async function listFolder(folderId: string, key: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files')
    url.searchParams.set('q', `'${folderId}' in parents and trashed=false`)
    url.searchParams.set('key', key)
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType)')
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url.toString())
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Drive API HTTP ${res.status}: ${body.slice(0, 300)}`)
    }
    const json = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string }
    files.push(...(json.files ?? []))
    pageToken = json.nextPageToken
  } while (pageToken)
  return files
}

// ── main ────────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('\n⛔ No Google API key found (GOOGLE_API_KEY / GOOGLE_DRIVE_API_KEY).')
    console.error('   This script needs the Drive API to list the certificates folder.\n')
    console.error('   Create one (folder is publicly link-shared, so no OAuth is needed):')
    console.error('     1. console.cloud.google.com → select or create a project')
    console.error('     2. APIs & Services → enable "Google Drive API"')
    console.error('     3. Credentials → Create credentials → API key')
    console.error('     4. Restrict the key to the Google Drive API only')
    console.error('     5. Add to .env.local:  GOOGLE_API_KEY=your_key_here')
    console.error('   Then re-run:  npx tsx scripts/import-cohort2-certs.ts\n')
    process.exit(1)
  }

  const { connectDB } = await import('../lib/mongodb')
  const { Student } = (await import('../lib/models/Student')) as { Student: typeof StudentModel }

  console.log('Listing Drive folder…')
  const all = await listFolder(FOLDER_ID, API_KEY)
  const pdfs = all.filter((f) => f.mimeType === 'application/pdf')
  const images = all.filter((f) => f.mimeType.startsWith('image/'))
  const others = all.filter((f) => f.mimeType !== 'application/pdf' && !f.mimeType.startsWith('image/'))
  const certFiles = [...pdfs, ...images] // treat pdf OR image as a certificate
  console.log(`  Found ${all.length} files — ${pdfs.length} pdf, ${images.length} image, ${others.length} other.`)

  console.log('\nConnecting to MongoDB…')
  await connectDB()
  const students = await Student.find({ cohort: COHORT }, 'name slug certificate_url').lean()
  const bySlug = new Map(students.map((s) => [s.slug as string, s]))
  const byName = new Map(students.map((s) => [normAlnum(s.name as string), s]))
  console.log(`  Loaded ${students.length} cohort-2 students.`)

  type Row = { file: string; student?: string; slug?: string }
  const matched: Row[] = []
  const skipped: Row[] = []
  const unmatched: Row[] = []

  for (const f of certFiles) {
    const candidate = candidateFromFilename(f.name)
    const candSlug = slugify(candidate)
    const student = bySlug.get(candSlug) ?? byName.get(normAlnum(candidate))
    if (!student) {
      unmatched.push({ file: f.name })
      continue
    }
    const viewUrl = `https://drive.google.com/file/d/${f.id}/view`
    const existing = (student as { certificate_url?: string }).certificate_url || ''
    if (existing) {
      skipped.push({ file: f.name, student: student.name as string, slug: student.slug as string })
      continue
    }
    await Student.updateOne({ _id: (student as { _id: unknown })._id }, { $set: { certificate_url: viewUrl } })
    matched.push({ file: f.name, student: student.name as string, slug: student.slug as string })
  }

  // ── Report ──
  console.log('\n════════════════════════════════════════════════════════')
  console.log('CERTIFICATE IMPORT REPORT')
  console.log('════════════════════════════════════════════════════════')
  console.log(`\nFiles in folder: ${all.length}  (pdf: ${pdfs.length}, image: ${images.length}, other: ${others.length})`)

  console.log(`\n✅ Matched & set certificate_url (${matched.length}):`)
  for (const m of matched) console.log(`  ${m.file}  →  ${m.student}  (${m.slug})`)

  console.log(`\n⏭️  Skipped — already had a certificate (${skipped.length}):`)
  for (const s of skipped) console.log(`  ${s.file}  →  ${s.student}`)

  console.log(`\n❓ UNMATCHED — no student found, resolve by hand (${unmatched.length}):`)
  for (const u of unmatched) console.log(`  ${u.file}`)

  const withCert = await Student.countDocuments({ cohort: COHORT, certificate_url: { $ne: '' } })
  console.log(`\nStudents with a certificate now: ${withCert} / ${students.length}`)
  console.log(`Still missing a certificate:      ${students.length - withCert}`)
  console.log('════════════════════════════════════════════════════════')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
