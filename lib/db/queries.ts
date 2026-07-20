/**
 * THE isolation core. Every read and write to students / brands / program_media
 * MUST go through this file. The `cohort` argument is required on every function.
 * One place to get right = data isolation guaranteed across all cohorts.
 */

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { connectDB } from '@/lib/mongodb'
import { Brand } from '@/lib/models/Brand'
import { Student } from '@/lib/models/Student'
import { ProgramMedia } from '@/lib/models/ProgramMedia'
import { extractYouTubeId, normalizeImageUrl } from '@/lib/normalize'

// ─── Public read shapes ────────────────────────────────────────────────────

export type BrandShape = {
  id: string
  slug: string
  name: string
  description: string
  revenue: number
  customers: number
  awards: string[]
  award_descriptions: string[]
  videos: string[]
  ad_statics: string[]
  flea_photos: string[]
  demo_photos: string[]
  website: string
  instagram: string
  product_photo: string
  feature_photo: string
  award_photo: string
}

export type StudentShape = {
  id: string
  slug: string
  name: string
  email: string
  certificate_url: string
  brand_id: string | null
  brand: BrandShape | null
  profile_photo: string
  convocation_photo: string
  flea_market_photo: string
  demo_day_photo: string
  personal_growth: string
}

// ─── Admin read shapes ─────────────────────────────────────────────────────

export type AdminBrand = {
  id: string
  slug: string
  name: string
  description: string
  revenue: number
  customers: number
  awards: string[]
  award_descriptions: string[]
  videos: string[]
  ad_statics: string[]
  website: string
  instagram: string
  feature_photo: string
}

export type AdminStudent = {
  id: string
  slug: string
  name: string
  email: string
  certificate_url: string
  brand_id: string | null
  brandName: string
  mediaScore: number
  profile_photo: string
  convocation_photo: string
  flea_market_photo: string
  demo_day_photo: string
}

// ─── Serializers ───────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeBrand(b: any): BrandShape {
  return {
    id: String(b._id),
    slug: b.slug ?? '',
    name: b.name ?? '',
    description: b.description ?? '',
    revenue: b.revenue ?? 0,
    customers: b.customers ?? 0,
    awards: b.awards ?? [],
    award_descriptions: b.award_descriptions ?? [],
    videos: b.videos ?? [],
    ad_statics: b.ad_statics ?? [],
    flea_photos: b.flea_photos ?? [],
    demo_photos: b.demo_photos ?? [],
    website: b.website ?? '',
    instagram: b.instagram ?? '',
    product_photo: b.product_photo ?? '',
    feature_photo: b.feature_photo ?? '',
    award_photo: b.award_photo ?? '',
  }
}

function serializeStudent(s: any): StudentShape {
  const brandDoc = s.brand_id && typeof s.brand_id === 'object' && s.brand_id._id ? s.brand_id : null
  return {
    id: String(s._id),
    slug: s.slug ?? '',
    name: s.name ?? '',
    email: s.email ?? '',
    certificate_url: s.certificate_url ?? '',
    brand_id: s.brand_id ? String(brandDoc ? brandDoc._id : s.brand_id) : null,
    brand: brandDoc ? serializeBrand(brandDoc) : null,
    profile_photo: s.profile_photo ?? '',
    convocation_photo: s.convocation_photo ?? '',
    flea_market_photo: s.flea_market_photo ?? '',
    demo_day_photo: s.demo_day_photo ?? '',
    personal_growth: s.personal_growth ?? '',
  }
}

function toAdminBrand(b: any): AdminBrand {
  return {
    id: String(b._id),
    slug: b.slug ?? '',
    name: b.name ?? '',
    description: b.description ?? '',
    revenue: b.revenue ?? 0,
    customers: b.customers ?? 0,
    awards: b.awards ?? [],
    award_descriptions: b.award_descriptions ?? [],
    videos: b.videos ?? [],
    ad_statics: b.ad_statics ?? [],
    website: b.website ?? '',
    instagram: b.instagram ?? '',
    feature_photo: b.feature_photo ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Public read caching ─────────────────────────────────────────────────────
//
// Public pages are force-dynamic (the cohort visibility/preview gate in the
// layout reads cookies), so without this every visit would re-run ~11 Atlas
// queries. We cache the *data* instead: each read is memoized under a per-cohort
// tag. Admin writes call revalidatePublic() → revalidateTag() to bust it
// instantly; the TTL is only a safety net. Admin reads stay uncached (editors
// must always see live data).

const PUBLIC_TTL = 300 // seconds — on-demand revalidateTag keeps edits instant
const cohortTag = (cohort: string) => `public:${cohort}`

/** Memoize a cohort-scoped public read, tagged so admin writes can bust it. */
function cachedCohortRead<T>(
  name: string,
  cohort: string,
  extraKey: string[],
  loader: () => Promise<T>
): Promise<T> {
  return unstable_cache(loader, [name, cohort, ...extraKey], {
    revalidate: PUBLIC_TTL,
    tags: [cohortTag(cohort)],
  })()
}

// ─── Public reads ──────────────────────────────────────────────────────────

export async function getAllStudentSlugs(cohort: string): Promise<string[]> {
  return cachedCohortRead('getAllStudentSlugs', cohort, [], async () => {
    await connectDB()
    const rows = await Student.find({ cohort }, 'slug').lean()
    return rows.map((r) => r.slug as string).filter(Boolean)
  })
}

export async function getStudentBySlug(cohort: string, slug: string): Promise<StudentShape | null> {
  return cachedCohortRead('getStudentBySlug', cohort, [slug], async () => {
    await connectDB()
    const doc = await Student.findOne({ cohort, slug }).populate('brand_id').lean()
    return doc ? serializeStudent(doc) : null
  })
}

export async function getStudentMeta(
  cohort: string,
  slug: string
): Promise<{ name: string; brand: { name: string } | null } | null> {
  return cachedCohortRead('getStudentMeta', cohort, [slug], async () => {
    await connectDB()
    const doc = await Student.findOne({ cohort, slug }, 'name brand_id')
      .populate('brand_id', 'name')
      .lean()
    if (!doc) return null
    const brand =
      doc.brand_id && typeof doc.brand_id === 'object'
        ? (doc.brand_id as { name?: string })
        : null
    return { name: (doc.name as string) ?? '', brand: brand ? { name: brand.name ?? '' } : null }
  })
}

export async function getDirectoryStudents(
  cohort: string
): Promise<{ slug: string; name: string; brand: { name: string; description: string } | null }[]> {
  return cachedCohortRead('getDirectoryStudents', cohort, [], async () => {
    await connectDB()
    const rows = await Student.find({ cohort }, 'slug name brand_id')
      .populate('brand_id', 'name description')
      .sort({ name: 1 })
      .lean()
    return rows.map((s) => {
      const brand =
        s.brand_id && typeof s.brand_id === 'object'
          ? (s.brand_id as { name?: string; description?: string })
          : null
      return {
        slug: (s.slug as string) ?? '',
        name: (s.name as string) ?? '',
        brand: brand ? { name: brand.name ?? '', description: brand.description ?? '' } : null,
      }
    })
  })
}

export async function getBrandsBySlugs(cohort: string, slugs: string[]): Promise<BrandShape[]> {
  return cachedCohortRead('getBrandsBySlugs', cohort, [...slugs].sort(), async () => {
    await connectDB()
    const rows = await Brand.find({ cohort, slug: { $in: slugs } }).lean()
    return rows.map(serializeBrand)
  })
}

// Fallback Top Performers for a cohort with no curated list: brands that have a
// feature_photo, highest revenue first. Cohort-scoped, so it never leaks.
export async function getFeaturedBrands(cohort: string, limit = 4): Promise<BrandShape[]> {
  return cachedCohortRead('getFeaturedBrands', cohort, [String(limit)], async () => {
    await connectDB()
    const rows = await Brand.find({ cohort, feature_photo: { $nin: [null, ''] } })
      .sort({ revenue: -1 })
      .limit(limit)
      .lean()
    return rows.map(serializeBrand)
  })
}

/** The single highest-revenue venture for a cohort (for the "Highest Revenue"
 *  highlight). Returns null when the cohort has no venture with revenue. */
export async function getTopBrandByRevenue(
  cohort: string
): Promise<{ name: string; revenue: number } | null> {
  return cachedCohortRead('getTopBrandByRevenue', cohort, [], async () => {
    await connectDB()
    const b = await Brand.findOne({ cohort }).sort({ revenue: -1 }).lean()
    if (!b || !((b.revenue as number) > 0)) return null
    return { name: (b.name as string) ?? '', revenue: (b.revenue as number) ?? 0 }
  })
}

export async function getAwardBrands(cohort: string): Promise<BrandShape[]> {
  return cachedCohortRead('getAwardBrands', cohort, [], async () => {
    await connectDB()
    const rows = await Brand.find({ cohort, awards: { $exists: true, $ne: [] } })
      .sort({ revenue: -1 })
      .lean()
    return rows.map(serializeBrand)
  })
}

export async function getAllStudentsBasic(
  cohort: string
): Promise<{ name: string; brand_id: string | null }[]> {
  return cachedCohortRead('getAllStudentsBasic', cohort, [], async () => {
    await connectDB()
    const rows = await Student.find({ cohort }, 'name brand_id').lean()
    return rows.map((s) => ({
      name: (s.name as string) ?? '',
      brand_id: s.brand_id ? String(s.brand_id) : null,
    }))
  })
}

export async function getProgramMedia(
  cohort: string
): Promise<{ key: string; value: string }[]> {
  return cachedCohortRead('getProgramMedia', cohort, [], async () => {
    await connectDB()
    const rows = await ProgramMedia.find({ cohort }, 'key value').lean()
    return rows.map((r) => ({ key: (r.key as string) ?? '', value: (r.value as string) ?? '' }))
  })
}

export type CohortStats = {
  students: number
  ventures: number
  totalRevenue: number
  awardedVentures: number
}

/** Live, cohort-scoped counts for the landing page + metadata (no hardcoded numbers). */
export async function getCohortStats(cohort: string): Promise<CohortStats> {
  return cachedCohortRead('getCohortStats', cohort, [], async () => {
    await connectDB()
    const [students, ventures, awardedVentures, revenueAgg] = await Promise.all([
      Student.countDocuments({ cohort }),
      Brand.countDocuments({ cohort }),
      Brand.countDocuments({ cohort, awards: { $exists: true, $ne: [] } }),
      Brand.aggregate([{ $match: { cohort } }, { $group: { _id: null, total: { $sum: '$revenue' } } }]),
    ])
    return { students, ventures, awardedVentures, totalRevenue: revenueAgg[0]?.total ?? 0 }
  })
}

// ─── Admin reads ───────────────────────────────────────────────────────────

export async function listBrands(cohort: string): Promise<AdminBrand[]> {
  await connectDB()
  const rows = await Brand.find({ cohort }).sort({ name: 1 }).lean()
  return rows.map(toAdminBrand)
}

export async function getBrand(cohort: string, id: string): Promise<AdminBrand | null> {
  await connectDB()
  const b = await Brand.findOne({ _id: id, cohort }).lean()
  return b ? toAdminBrand(b) : null
}

export async function listStudents(cohort: string): Promise<AdminStudent[]> {
  await connectDB()
  const rows = await Student.find({ cohort })
    .populate('brand_id', 'name videos ad_statics')
    .sort({ name: 1 })
    .lean()
  return rows.map((s) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const brand = s.brand_id && typeof s.brand_id === 'object' ? (s.brand_id as any) : null
    const mediaScore = [
      !!(s as any).profile_photo,
      !!(s as any).convocation_photo,
      !!(s as any).flea_market_photo,
      !!(s as any).demo_day_photo,
      Array.isArray(brand?.videos) && brand.videos.length > 0,
      Array.isArray(brand?.ad_statics) && brand.ad_statics.length > 0,
    ].filter(Boolean).length
    return {
      id: String(s._id),
      slug: (s.slug as string) ?? '',
      name: (s.name as string) ?? '',
      email: (s.email as string) ?? '',
      certificate_url: (s.certificate_url as string) ?? '',
      brand_id: brand ? String(brand._id) : s.brand_id ? String(s.brand_id) : null,
      brandName: brand?.name ?? '',
      mediaScore,
      profile_photo: (s as any).profile_photo ?? '',
      convocation_photo: (s as any).convocation_photo ?? '',
      flea_market_photo: (s as any).flea_market_photo ?? '',
      demo_day_photo: (s as any).demo_day_photo ?? '',
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
}

export async function getStudent(cohort: string, id: string): Promise<AdminStudent | null> {
  await connectDB()
  const s = await Student.findOne({ _id: id, cohort })
    .populate('brand_id', 'name videos ad_statics')
    .lean()
  if (!s) return null
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const brand = s.brand_id && typeof s.brand_id === 'object' ? (s.brand_id as any) : null
  const mediaScore = [
    !!(s as any).profile_photo,
    !!(s as any).convocation_photo,
    !!(s as any).flea_market_photo,
    !!(s as any).demo_day_photo,
    Array.isArray(brand?.videos) && brand.videos.length > 0,
    Array.isArray(brand?.ad_statics) && brand.ad_statics.length > 0,
  ].filter(Boolean).length
  return {
    id: String(s._id),
    slug: (s.slug as string) ?? '',
    name: (s.name as string) ?? '',
    email: (s.email as string) ?? '',
    certificate_url: (s.certificate_url as string) ?? '',
    brand_id: brand ? String(brand._id) : s.brand_id ? String(s.brand_id) : null,
    brandName: brand?.name ?? '',
    mediaScore,
    profile_photo: (s as any).profile_photo ?? '',
    convocation_photo: (s as any).convocation_photo ?? '',
    flea_market_photo: (s as any).flea_market_photo ?? '',
    demo_day_photo: (s as any).demo_day_photo ?? '',
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function listProgramMedia(cohort: string): Promise<{ key: string; value: string }[]> {
  await connectDB()
  const rows = await ProgramMedia.find({ cohort }).sort({ key: 1 }).lean()
  return rows.map((r) => ({ key: (r.key as string) ?? '', value: (r.value as string) ?? '' }))
}

// ─── Admin writes ──────────────────────────────────────────────────────────

const cleanArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => x != null && x !== '').map(String) : []

export async function createStudent(
  cohort: string,
  data: {
    slug: string
    name: string
    email?: string
    certificate_url?: string
    brand_id?: string | null
    profile_photo?: string
    convocation_photo?: string
    flea_market_photo?: string
    demo_day_photo?: string
  }
) {
  await connectDB()
  return Student.create({
    cohort,
    slug: data.slug,
    name: data.name,
    email: data.email ?? '',
    certificate_url: data.certificate_url ?? '',
    brand_id: data.brand_id || null,
    profile_photo: data.profile_photo ? normalizeImageUrl(data.profile_photo) : '',
    convocation_photo: data.convocation_photo ? normalizeImageUrl(data.convocation_photo) : '',
    flea_market_photo: data.flea_market_photo ? normalizeImageUrl(data.flea_market_photo) : '',
    demo_day_photo: data.demo_day_photo ? normalizeImageUrl(data.demo_day_photo) : '',
  })
}

export async function updateStudent(
  cohort: string,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>
) {
  await connectDB()
  const update: Record<string, unknown> = {}
  for (const key of ['slug', 'name', 'email', 'certificate_url'] as const) {
    if (key in body) update[key] = body[key]
  }
  if ('brand_id' in body) update.brand_id = body.brand_id || null
  for (const key of ['profile_photo', 'convocation_photo', 'flea_market_photo', 'demo_day_photo'] as const) {
    if (key in body) update[key] = body[key] ? normalizeImageUrl(String(body[key])) : ''
  }
  return Student.findOneAndUpdate({ _id: id, cohort }, update, { new: true })
}

export async function deleteStudent(cohort: string, id: string) {
  await connectDB()
  return Student.findOneAndDelete({ _id: id, cohort })
}

export async function createBrand(
  cohort: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>
) {
  await connectDB()
  return Brand.create({
    cohort,
    slug: body.slug,
    name: body.name,
    description: body.description ?? '',
    revenue: Number(body.revenue) || 0,
    customers: Number(body.customers) || 0,
    awards: cleanArr(body.awards),
    award_descriptions: cleanArr(body.award_descriptions),
    videos: cleanArr(body.videos).map(extractYouTubeId).filter(Boolean),
    ad_statics: cleanArr(body.ad_statics).map(normalizeImageUrl).filter(Boolean),
    website: body.website ?? '',
    instagram: body.instagram ?? '',
    feature_photo: normalizeImageUrl(String(body.feature_photo ?? '')),
  })
}

export async function updateBrand(
  cohort: string,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>
) {
  await connectDB()
  const update: Record<string, unknown> = {}
  const STRING_FIELDS = ['slug', 'name', 'description', 'website', 'instagram'] as const
  const NUMBER_FIELDS = ['revenue', 'customers'] as const
  const ARRAY_FIELDS = ['awards', 'award_descriptions', 'videos', 'ad_statics'] as const

  for (const k of STRING_FIELDS) if (k in body) update[k] = body[k] ?? ''
  for (const k of NUMBER_FIELDS) if (k in body) update[k] = Number(body[k]) || 0
  for (const k of ARRAY_FIELDS) {
    if (!(k in body)) continue
    let arr: string[] = cleanArr(body[k])
    if (k === 'videos') arr = arr.map(extractYouTubeId).filter(Boolean)
    else if (k !== 'awards') arr = arr.map(normalizeImageUrl).filter(Boolean)
    update[k] = arr
  }
  if ('feature_photo' in body) {
    update.feature_photo = normalizeImageUrl(String(body.feature_photo ?? ''))
  }
  return Brand.findOneAndUpdate({ _id: id, cohort }, update, { new: true })
}

export async function deleteBrand(cohort: string, id: string) {
  await connectDB()
  return Brand.findOneAndDelete({ _id: id, cohort })
}

const JSON_ARRAY_KEYS = new Set([
  'landing_hero_image',
  'landing_demo_day',
  'landing_flea_photos',
  'landing_highlights',
])

function normalizeMedia(key: string, value: string): string {
  if (JSON_ARRAY_KEYS.has(key)) return value
  if (/video_id$/.test(key)) return extractYouTubeId(value)
  if (/(photo|image|img|poster|thumb)/i.test(key)) return normalizeImageUrl(value)
  return value
}

export async function upsertProgramMedia(
  cohort: string,
  items: { key: string; value: string }[]
) {
  await connectDB()
  await Promise.all(
    items
      .filter((it) => it && it.key)
      .map((it) => {
        const key = String(it.key)
        const value = String(it.value ?? '')
        return ProgramMedia.updateOne(
          { cohort, key },
          { $set: { value: normalizeMedia(key, value) } },
          { upsert: true }
        )
      })
  )
}

// ─── Cache revalidation ────────────────────────────────────────────────────

export function revalidatePublic(cohort: string) {
  // Bust the cached public reads for this cohort (see cachedCohortRead) so admin
  // edits show up immediately, then refresh the rendered pages. `{ expire: 0 }`
  // forces the next request to fetch fresh data (read-your-writes) rather than
  // serving stale-while-revalidate.
  revalidateTag(cohortTag(cohort), { expire: 0 })
  revalidatePath(`/${cohort}`)
  revalidatePath(`/${cohort}/directory`)
  revalidatePath(`/${cohort}/[slug]`, 'page')
}
