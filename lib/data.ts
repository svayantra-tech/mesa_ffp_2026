import { connectDB } from './mongodb'
import { Brand } from './models/Brand'
import { Student } from './models/Student'
import { ProgramMedia } from './models/ProgramMedia'

// Plain, JSON-serializable shapes returned to React Server Components.
// Field names mirror the old Supabase columns so page markup stays unchanged.

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
}

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
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** All student slugs — for generateStaticParams. */
export async function getAllStudentSlugs(): Promise<string[]> {
  await connectDB()
  const rows = await Student.find({}, 'slug').lean()
  return rows.map((r) => r.slug as string).filter(Boolean)
}

/** A single student with their brand fully populated. */
export async function getStudentBySlug(slug: string): Promise<StudentShape | null> {
  await connectDB()
  const doc = await Student.findOne({ slug }).populate('brand_id').lean()
  return doc ? serializeStudent(doc) : null
}

/** Lightweight student + brand name, for <head> metadata. */
export async function getStudentMeta(
  slug: string
): Promise<{ name: string; brand: { name: string } | null } | null> {
  await connectDB()
  const doc = await Student.findOne({ slug }, 'name brand_id')
    .populate('brand_id', 'name')
    .lean()
  if (!doc) return null
  const brand =
    doc.brand_id && typeof doc.brand_id === 'object'
      ? (doc.brand_id as { name?: string })
      : null
  return { name: (doc.name as string) ?? '', brand: brand ? { name: brand.name ?? '' } : null }
}

/** Directory listing — student + brand summary, ordered by name. */
export async function getDirectoryStudents(): Promise<
  { slug: string; name: string; brand: { name: string; description: string } | null }[]
> {
  await connectDB()
  const rows = await Student.find({}, 'slug name brand_id')
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
}

/** Brands matching a set of slugs (home page featured ventures). */
export async function getBrandsBySlugs(slugs: string[]): Promise<BrandShape[]> {
  await connectDB()
  const rows = await Brand.find({ slug: { $in: slugs } }).lean()
  return rows.map(serializeBrand)
}

/** Brands that have at least one award, ordered by revenue desc. */
export async function getAwardBrands(): Promise<BrandShape[]> {
  await connectDB()
  const rows = await Brand.find({ awards: { $exists: true, $ne: [] } })
    .sort({ revenue: -1 })
    .lean()
  return rows.map(serializeBrand)
}

/** All students with just name + brand_id (home page founder grouping). */
export async function getAllStudentsBasic(): Promise<{ name: string; brand_id: string | null }[]> {
  await connectDB()
  const rows = await Student.find({}, 'name brand_id').lean()
  return rows.map((s) => ({
    name: (s.name as string) ?? '',
    brand_id: s.brand_id ? String(s.brand_id) : null,
  }))
}

/** Program-wide key/value media map. */
export async function getProgramMedia(): Promise<{ key: string; value: string }[]> {
  await connectDB()
  const rows = await ProgramMedia.find({}, 'key value').lean()
  return rows.map((r) => ({ key: (r.key as string) ?? '', value: (r.value as string) ?? '' }))
}
