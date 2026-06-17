import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Brand } from '@/lib/models/Brand'
import { listBrands, revalidatePublic } from '@/lib/admin-data'
import { extractYouTubeId, normalizeImageUrl } from '@/lib/normalize'

export const runtime = 'nodejs'

const cleanArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => x != null && x !== '').map(String) : []

export async function GET() {
  return NextResponse.json(await listBrands())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { slug, name } = body
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }
  await connectDB()
  try {
    const doc = await Brand.create({
      slug,
      name,
      description: body.description ?? '',
      revenue: Number(body.revenue) || 0,
      customers: Number(body.customers) || 0,
      awards: cleanArr(body.awards),
      videos: cleanArr(body.videos).map(extractYouTubeId).filter(Boolean),
      ad_statics: cleanArr(body.ad_statics).map(normalizeImageUrl).filter(Boolean),
      flea_photos: cleanArr(body.flea_photos).map(normalizeImageUrl).filter(Boolean),
      demo_photos: cleanArr(body.demo_photos).map(normalizeImageUrl).filter(Boolean),
      website: body.website ?? '',
      instagram: body.instagram ?? '',
      product_photo: body.product_photo ? String(body.product_photo) : '',
    })
    revalidatePublic()
    return NextResponse.json({ id: String(doc._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
