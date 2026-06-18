import { revalidatePath } from 'next/cache'
import { connectDB } from './mongodb'
import { Brand } from './models/Brand'
import { Student } from './models/Student'
import { ProgramMedia } from './models/ProgramMedia'

// Admin-facing read shapes (include ids; full editable field set).

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

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toAdminBrand(b: any): AdminBrand {
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
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listBrands(): Promise<AdminBrand[]> {
  await connectDB()
  const rows = await Brand.find({}).sort({ name: 1 }).lean()
  return rows.map(toAdminBrand)
}

export async function getBrand(id: string): Promise<AdminBrand | null> {
  await connectDB()
  const b = await Brand.findById(id).lean()
  return b ? toAdminBrand(b) : null
}

export async function listStudents(): Promise<AdminStudent[]> {
  await connectDB()
  const rows = await Student.find({}).populate('brand_id', 'name videos ad_statics').sort({ name: 1 }).lean()
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

export async function getStudent(id: string): Promise<AdminStudent | null> {
  await connectDB()
  const s = await Student.findById(id).populate('brand_id', 'name videos ad_statics').lean()
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

export async function listProgramMedia(): Promise<{ key: string; value: string }[]> {
  await connectDB()
  const rows = await ProgramMedia.find({}).sort({ key: 1 }).lean()
  return rows.map((r) => ({ key: (r.key as string) ?? '', value: (r.value as string) ?? '' }))
}

/**
 * Purge public caches after an admin edit so changes publish on next visit.
 * Covers the home page, directory, and every portfolio page (shared brands /
 * AI tools affect all of them).
 */
export function revalidatePublic() {
  revalidatePath('/')
  revalidatePath('/directory')
  revalidatePath('/[slug]', 'page')
}
