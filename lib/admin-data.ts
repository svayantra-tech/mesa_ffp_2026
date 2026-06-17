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
  videos: string[]
  ad_statics: string[]
  flea_photos: string[]
  demo_photos: string[]
  website: string
  instagram: string
  product_photo: string
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
    videos: b.videos ?? [],
    ad_statics: b.ad_statics ?? [],
    flea_photos: b.flea_photos ?? [],
    demo_photos: b.demo_photos ?? [],
    website: b.website ?? '',
    instagram: b.instagram ?? '',
    product_photo: b.product_photo ?? '',
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
  const rows = await Student.find({}).populate('brand_id', 'name product_photo videos ad_statics flea_photos demo_photos').sort({ name: 1 }).lean()
  return rows.map((s) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const brand = s.brand_id && typeof s.brand_id === 'object' ? (s.brand_id as any) : null
    const mediaScore = brand ? [
      !!brand.product_photo,
      Array.isArray(brand.videos) && brand.videos.length > 0,
      Array.isArray(brand.ad_statics) && brand.ad_statics.length > 0,
      Array.isArray(brand.flea_photos) && brand.flea_photos.length > 0,
      Array.isArray(brand.demo_photos) && brand.demo_photos.length > 0,
    ].filter(Boolean).length : 0
    return {
      id: String(s._id),
      slug: (s.slug as string) ?? '',
      name: (s.name as string) ?? '',
      email: (s.email as string) ?? '',
      certificate_url: (s.certificate_url as string) ?? '',
      brand_id: brand ? String(brand._id) : s.brand_id ? String(s.brand_id) : null,
      brandName: brand?.name ?? '',
      mediaScore,
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
}

export async function getStudent(id: string): Promise<AdminStudent | null> {
  await connectDB()
  const s = await Student.findById(id).populate('brand_id', 'name').lean()
  if (!s) return null
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const brand = s.brand_id && typeof s.brand_id === 'object' ? (s.brand_id as any) : null
  return {
    id: String(s._id),
    slug: (s.slug as string) ?? '',
    name: (s.name as string) ?? '',
    email: (s.email as string) ?? '',
    certificate_url: (s.certificate_url as string) ?? '',
    brand_id: brand ? String(brand._id) : s.brand_id ? String(s.brand_id) : null,
    brandName: brand?.name ?? '',
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
