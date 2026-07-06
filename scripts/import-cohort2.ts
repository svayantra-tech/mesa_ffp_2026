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

/** Header lookup by substring — for long/combined headers like the name+email column. */
function findHeaderContains(headers: string[], needle: string): string | undefined {
  const t = normalizeHeader(needle)
  return headers.find((h) => normalizeHeader(h).includes(t))
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

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Assign a slug not already in `taken`; append -2/-3… on collision. Records the result. */
function makeUniqueSlug(base: string, taken: Set<string>): string {
  const root = base || 'student'
  let slug = root
  let n = 2
  while (taken.has(slug)) slug = `${root}-${n++}`
  taken.add(slug)
  return slug
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

  // The email lives in a combined "Team Members Full Name & Email Id (…)" column,
  // one clean address per member row — resolve it by substring, not exact match.
  if (!COL_MAP.email) {
    COL_MAP.email = findHeaderContains(headers, 'email id') ?? headers.find((h) => /email/i.test(h))
  }

  console.log('\n── Column mapping ────────────────────────────────────')
  for (const [field, col] of Object.entries(COL_MAP)) {
    console.log(`  ${field.padEnd(14)} ← "${col ?? '(NOT FOUND)'}"`)
  }

  if (!COL_MAP.team || !COL_MAP.names) {
    throw new Error('Cannot find required "Team Name" / "Names" columns. Aborting.')
  }

  console.log('\nConnecting to MongoDB…')
  await connectDB()

  // Preload for collision-safe, idempotent per-row creation:
  //  • usedSlugs — every slug already in the DB (slug is globally unique), so new
  //    students never collide with an existing one (or with each other this run).
  //  • existingKeys — a natural key (brand + normalized name) for each cohort-2
  //    student already imported, so re-runs match and SKIP instead of creating
  //    duplicates. Email is deliberately NOT part of the key: it can be blank or
  //    change between sheet exports, and a name is unique within a team — keying
  //    on email caused duplicate rows when a re-run read a different email value.
  const allSlugRows = await Student.find({}, 'slug').lean()
  const usedSlugs = new Set<string>(allSlugRows.map((s) => s.slug as string).filter(Boolean))
  const existingC2 = await Student.find({ cohort: COHORT }, 'name brand_id').lean()
  const naturalKey = (brandId: string, name: string) => `${brandId}::${normName(name)}`
  const existingKeys = new Set<string>(
    existingC2.map((s) => naturalKey(String(s.brand_id), (s.name as string) ?? ''))
  )

  // Group rows by team. The Team Name cell is vertically MERGED in the sheet, so
  // CSV export only fills it on each team's first (header) row and leaves every
  // following member row blank. Forward-fill the last-seen team name so each
  // member row is attributed to the correct team instead of being dropped.
  const teams = new Map<string, Record<string, string>[]>()
  let currentTeam = ''
  for (const row of rows) {
    const teamCell = cell(row, COL_MAP.team)
    if (teamCell) currentTeam = teamCell
    if (!currentTeam) continue // rows before the first team header (shouldn't happen)
    if (!teams.has(currentTeam)) teams.set(currentTeam, [])
    teams.get(currentTeam)!.push(row)
  }

  const teamReports: TeamReport[] = []

  for (const [teamName, teamRows] of teams) {
    console.log(`\n── ${teamName} ──────────────────────────────────────`)
    const brandSlug = slugify(teamName)

    // For each brand-level field, take the FIRST NON-EMPTY value across ALL of the
    // team's rows — never assume row[0] holds it (a team's rows are often split so
    // that Awards/Revenue/etc. live on a different row than the first).
    const firstCell = (col: string | undefined): string => {
      if (!col) return ''
      for (const r of teamRows) {
        const v = cell(r, col)
        if (v) return v
      }
      return ''
    }

    const videoCols = [COL_MAP.video1, COL_MAP.video2, COL_MAP.video3, COL_MAP.video4]
    const videoIds = videoCols
      .map((col) => firstCell(col))
      .filter((raw) => raw && !/instagram\.com/i.test(raw))
      .map((raw) => extractDriveId(raw))
      .filter((id): id is string => Boolean(id))

    const staticCols = [COL_MAP.static1, COL_MAP.static2, COL_MAP.static3]
    const adStaticUrls: string[] = []
    let adStaticsSkipped = 0
    for (const col of staticCols) {
      const raw = firstCell(col)
      if (!raw) continue
      const id = extractDriveId(raw)
      if (id) adStaticUrls.push(`https://drive.google.com/thumbnail?id=${id}&sz=w2000`)
      else adStaticsSkipped++
    }

    const description = firstCell(COL_MAP.description)
    const website = firstCell(COL_MAP.website)
    const instagram = firstCell(COL_MAP.instagram)
    const revenue = parseRevenue(firstCell(COL_MAP.revenue))
    const awardsRaw = firstCell(COL_MAP.awards)

    let brand = await Brand.findOne({ cohort: COHORT, slug: brandSlug })
    let brandStatus: 'CREATED' | 'SKIPPED'

    if (brand) {
      brandStatus = 'SKIPPED'
      console.log('  Brand: SKIPPED (already exists)')

      // Backfill ANY brand-level field that is currently empty from the first
      // non-empty sheet value. Never overwrite a field that already has data —
      // this preserves re-hosted ad_statics / videos from earlier runs.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backfill: Record<string, any> = {}
      if (description && !brand.description) backfill.description = description
      if (website && !brand.website) backfill.website = website
      if (instagram && !brand.instagram) backfill.instagram = instagram
      if (revenue && !brand.revenue) backfill.revenue = revenue
      if (awardsRaw && (!Array.isArray(brand.awards) || brand.awards.length === 0)) backfill.awards = [awardsRaw]
      if (videoIds.length && (!Array.isArray(brand.videos) || brand.videos.length === 0)) backfill.videos = videoIds
      if (adStaticUrls.length && (!Array.isArray(brand.ad_statics) || brand.ad_statics.length === 0)) backfill.ad_statics = adStaticUrls
      if (Object.keys(backfill).length > 0) {
        await Brand.updateOne({ _id: brand._id }, { $set: backfill })
        console.log(`    Backfilled: ${Object.keys(backfill).join(', ')}`)
      }
    } else {
      brand = await Brand.create({
        cohort: COHORT,
        slug: brandSlug,
        name: teamName,
        description,
        website,
        instagram,
        revenue,
        videos: videoIds,
        ad_statics: adStaticUrls,
        awards: awardsRaw ? [awardsRaw] : [],
      })
      brandStatus = 'CREATED'
      console.log(`  Brand: CREATED (videos: ${videoIds.length}, ad_statics: ${adStaticUrls.length}, skipped: ${adStaticsSkipped})`)
    }

    // ── students: ONE PER ROW ──
    const studentReports: StudentReport[] = []

    for (const row of teamRows) {
      const studentName = cell(row, COL_MAP.names)
      const studentEmail = cell(row, COL_MAP.email)
      // A student record needs a display name. Rows with no Name are merged-cell
      // spillover or stray re-submissions (an email with no name can't render a
      // portfolio) — skip them. Never skip a *named* student over a slug collision.
      if (!studentName) continue

      // Idempotency by natural key (brand + name): a re-run matches here and SKIPs,
      // so students already imported (with their media / growth / awards) are
      // preserved and never duplicated.
      const key = naturalKey(String(brand._id), studentName)
      if (existingKeys.has(key)) {
        console.log(`    ${studentName}: SKIPPED (already imported)`)
        studentReports.push({
          name: studentName,
          status: 'SKIPPED',
          photos: { flea_market_photo: false, demo_day_photo: false, convocation_photo: false },
        })
        continue
      }
      existingKeys.add(key)

      // Globally-unique slug; append -2/-3… on collision (based on Names).
      const baseSlug = slugify(studentName) || slugify(studentEmail.split('@')[0])
      const slug = makeUniqueSlug(baseSlug, usedSlugs)

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
        email: studentEmail,
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
