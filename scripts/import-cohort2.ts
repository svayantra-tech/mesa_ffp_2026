/**
 * One-off: import cohort-2 brands + students from the published Google Sheet.
 * Idempotent — skips brands/students that already exist in cohort-2.
 *
 * Run:  npx tsx scripts/import-cohort2.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import Papa from 'papaparse'
import type { Brand as BrandModel } from '../lib/models/Brand'
import type { Student as StudentModel } from '../lib/models/Student'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRoBEfBSb0uAukxy0x8Kb1HVhs1D-fc6xp3W_9XGVBuNJ48S9i7jVpkrroACR-AIazg58sy7bKTrEt3/pub?output=csv'

const COHORT = 'cohort-2'

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeHeader(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

function findHeader(headers: string[], needle: string): string | undefined {
  const target = normalizeHeader(needle)
  return headers.find((h) => normalizeHeader(h) === target)
}

/** Extract a Google Drive file ID from a URL, per the two known URL shapes. */
function extractDriveId(url: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  let m = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  m = trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  return null
}

function parseRevenue(raw: string): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[,\s]/g, '')
  const n = parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : 0
}

/** Drive URL → thumbnail URL at the given size; bare/non-Drive value → ''. */
function toThumbnail(raw: string, sz: number): string {
  const id = extractDriveId(raw ?? '')
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${sz}` : ''
}

function cell(row: Record<string, string>, col: string | undefined): string {
  if (!col) return ''
  return (row[col] ?? '').trim()
}

// ── column resolution ───────────────────────────────────────────────────────

const COLS = {
  team: 'Team Name ',
  description: 'One Line Description about the Brand ',
  website: 'Website Link',
  instagram: 'Instagram Link',
  revenue: 'Revenue ',
  video1: 'Video Ad -1',
  video2: 'Video Ad -2',
  video3: 'Video Ad -3',
  video4: 'Video Ad - 4',
  static1: 'Static Ad -1 ',
  static2: 'Static Ad -2',
  static3: 'Static Ad - 3',
  awards: 'Awards',
  names: 'Names',
  email: ' Email Id',
  flea: 'Flea Market Photo\t',
  demo: 'Demo Day',
  convocation: 'Convocation photos',
} as const

// ── report types ─────────────────────────────────────────────────────────────

type StudentReport = {
  name: string
  status: 'CREATED' | 'SKIPPED'
  photos: { flea_market_photo: boolean; demo_day_photo: boolean; convocation_photo: boolean }
}

type TeamReport = {
  team: string
  brandStatus: 'CREATED' | 'SKIPPED'
  videoIds: string[]
  adStaticUrls: string[]
  adStaticsSkipped: number
  students: StudentReport[]
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { connectDB } = await import('../lib/mongodb')
  const { Brand } = (await import('../lib/models/Brand')) as { Brand: typeof BrandModel }
  const { Student } = (await import('../lib/models/Student')) as { Student: typeof StudentModel }

  console.log('Fetching sheet CSV…')
  const csvText = await fetch(SHEET_CSV_URL).then((r) => {
    if (!r.ok) throw new Error(`Sheet fetch failed: ${r.status}`)
    return r.text()
  })

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  const rows = parsed.data
  const headers = parsed.meta.fields ?? []

  console.log('\n── Detected headers ──────────────────────────────────')
  console.log(headers.join(' | '))

  const COL_MAP: Record<keyof typeof COLS, string | undefined> = Object.fromEntries(
    Object.entries(COLS).map(([key, needle]) => [key, findHeader(headers, needle)])
  ) as Record<keyof typeof COLS, string | undefined>

  console.log('\n── Column mapping ────────────────────────────────────')
  for (const [field, col] of Object.entries(COL_MAP)) {
    console.log(`  ${field.padEnd(14)} ← "${col ?? '(NOT FOUND)'}"`)
  }

  if (!COL_MAP.team || !COL_MAP.names) {
    throw new Error('Cannot find required "Team Name" / "Names" columns. Aborting.')
  }

  console.log('\nConnecting to MongoDB…')
  await connectDB()

  // Group rows by team name, preserving first-seen order.
  const teams = new Map<string, Record<string, string>[]>()
  for (const row of rows) {
    const teamName = cell(row, COL_MAP.team)
    if (!teamName) continue
    if (!teams.has(teamName)) teams.set(teamName, [])
    teams.get(teamName)!.push(row)
  }

  const teamReports: TeamReport[] = []

  for (const [teamName, teamRows] of teams) {
    console.log(`\n── ${teamName} ──────────────────────────────────────`)
    const firstRow = teamRows[0]
    const brandSlug = slugify(teamName)

    let brand = await Brand.findOne({ cohort: COHORT, slug: brandSlug })
    let brandStatus: 'CREATED' | 'SKIPPED'
    let videoIds: string[] = []
    let adStaticUrls: string[] = []
    let adStaticsSkipped = 0

    if (brand) {
      brandStatus = 'SKIPPED'
      console.log('  Brand: SKIPPED (already exists)')

      // Backfill website/instagram if they were missed by a prior run's column mapping.
      const backfill: Record<string, string> = {}
      const website = cell(firstRow, COL_MAP.website)
      const instagram = cell(firstRow, COL_MAP.instagram)
      if (website && !brand.website) backfill.website = website
      if (instagram && !brand.instagram) backfill.instagram = instagram
      if (Object.keys(backfill).length > 0) {
        await Brand.updateOne({ _id: brand._id }, { $set: backfill })
        console.log(`    Backfilled: ${Object.keys(backfill).join(', ')}`)
      }
    } else {
      const videoCols = [COL_MAP.video1, COL_MAP.video2, COL_MAP.video3, COL_MAP.video4]
      videoIds = videoCols
        .map((col) => cell(firstRow, col))
        .filter((raw) => raw && !/instagram\.com/i.test(raw))
        .map((raw) => extractDriveId(raw))
        .filter((id): id is string => Boolean(id))

      const staticCols = [COL_MAP.static1, COL_MAP.static2, COL_MAP.static3]
      const staticRaws = staticCols.map((col) => cell(firstRow, col)).filter(Boolean)
      for (const raw of staticRaws) {
        const id = extractDriveId(raw)
        if (id) {
          adStaticUrls.push(`https://drive.google.com/thumbnail?id=${id}&sz=w2000`)
        } else {
          adStaticsSkipped++
        }
      }

      const awardsRaw = cell(firstRow, COL_MAP.awards)

      brand = await Brand.create({
        cohort: COHORT,
        slug: brandSlug,
        name: teamName,
        description: cell(firstRow, COL_MAP.description),
        website: cell(firstRow, COL_MAP.website),
        instagram: cell(firstRow, COL_MAP.instagram),
        revenue: parseRevenue(cell(firstRow, COL_MAP.revenue)),
        videos: videoIds,
        ad_statics: adStaticUrls,
        awards: awardsRaw ? [awardsRaw] : [],
      })
      brandStatus = 'CREATED'
      console.log(`  Brand: CREATED (videos: ${videoIds.length}, ad_statics: ${adStaticUrls.length}, skipped: ${adStaticsSkipped})`)
    }

    // ── students ──
    const studentReports: StudentReport[] = []
    const usedSlugs = new Set<string>()

    for (const row of teamRows) {
      const studentName = cell(row, COL_MAP.names)
      if (!studentName) continue

      let baseSlug = slugify(studentName)
      let slug = baseSlug
      let n = 2
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${n}`
        n++
      }
      usedSlugs.add(slug)

      const existing = await Student.findOne({ cohort: COHORT, slug })
      if (existing) {
        console.log(`    ${studentName}: SKIPPED (already exists)`)
        studentReports.push({
          name: studentName,
          status: 'SKIPPED',
          photos: { flea_market_photo: false, demo_day_photo: false, convocation_photo: false },
        })
        continue
      }

      const fleaRaw = cell(row, COL_MAP.flea)
      const demoRaw = cell(row, COL_MAP.demo)
      const convoRaw = cell(row, COL_MAP.convocation)

      const flea_market_photo = toThumbnail(fleaRaw, 1600)
      const demo_day_photo = toThumbnail(demoRaw, 1600)
      const convocation_photo = toThumbnail(convoRaw, 1600)

      await Student.create({
        cohort: COHORT,
        slug,
        name: studentName,
        email: cell(row, COL_MAP.email),
        brand_id: brand._id,
        flea_market_photo,
        demo_day_photo,
        convocation_photo,
        certificate_url: '',
      })

      console.log(
        `    ${studentName}: CREATED (flea:${flea_market_photo ? 'Y' : 'blank'}, demo:${demo_day_photo ? 'Y' : 'blank'}, convo:${convocation_photo ? 'Y' : 'blank'})`
      )

      studentReports.push({
        name: studentName,
        status: 'CREATED',
        photos: {
          flea_market_photo: Boolean(flea_market_photo),
          demo_day_photo: Boolean(demo_day_photo),
          convocation_photo: Boolean(convocation_photo),
        },
      })
    }

    teamReports.push({
      team: teamName,
      brandStatus,
      videoIds,
      adStaticUrls,
      adStaticsSkipped,
      students: studentReports,
    })
  }

  // ── Full per-team report ──
  console.log('\n\n════════════════════════════════════════════════════════')
  console.log('PER-TEAM REPORT')
  console.log('════════════════════════════════════════════════════════')
  for (const t of teamReports) {
    console.log(`\n${t.team}`)
    console.log(`  Brand: ${t.brandStatus}`)
    console.log(`  Videos (${t.videoIds.length}): ${t.videoIds.join(', ') || '(none)'}`)
    console.log(`  Ad statics (${t.adStaticUrls.length} stored, ${t.adStaticsSkipped} skipped):`)
    for (const url of t.adStaticUrls) console.log(`    ${url}`)
    for (const s of t.students) {
      const p = s.photos
      console.log(
        `  ${s.name} → ${s.status} (flea:${p.flea_market_photo ? 'Y' : 'blank'}, demo:${p.demo_day_photo ? 'Y' : 'blank'}, convo:${p.convocation_photo ? 'Y' : 'blank'})`
      )
    }
  }

  // ── Summary ──
  const brandsCreated = teamReports.filter((t) => t.brandStatus === 'CREATED').length
  const brandsSkipped = teamReports.filter((t) => t.brandStatus === 'SKIPPED').length
  const allStudents = teamReports.flatMap((t) => t.students)
  const studentsCreated = allStudents.filter((s) => s.status === 'CREATED').length
  const studentsSkipped = allStudents.filter((s) => s.status === 'SKIPPED').length
  const totalVideos = teamReports.reduce((sum, t) => sum + t.videoIds.length, 0)
  const totalAdStatics = teamReports.reduce((sum, t) => sum + t.adStaticUrls.length, 0)
  const studentsWithPhoto = allStudents.filter(
    (s) => s.photos.flea_market_photo || s.photos.demo_day_photo || s.photos.convocation_photo
  ).length
  const studentsAllBlank = allStudents.length - studentsWithPhoto

  console.log('\n════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('════════════════════════════════════════════════════════')
  console.log(`Brands created:   ${brandsCreated}`)
  console.log(`Brands skipped:   ${brandsSkipped}`)
  console.log(`Students created: ${studentsCreated}`)
  console.log(`Students skipped: ${studentsSkipped}`)
  console.log(`Total videos stored:      ${totalVideos}`)
  console.log(`Total ad_statics stored:  ${totalAdStatics}`)
  console.log(`Students with ≥1 photo:   ${studentsWithPhoto}`)
  console.log(`Students with all blank:  ${studentsAllBlank}`)
  console.log('════════════════════════════════════════════════════════')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
