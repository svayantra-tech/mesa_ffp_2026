import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Brand } from '@/lib/models/Brand'
import { listBrands, revalidatePublic } from '@/lib/admin-data'

export const runtime = 'nodejs'

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
      awards: body.awards ?? [],
      videos: body.videos ?? [],
      ad_statics: body.ad_statics ?? [],
      flea_photos: body.flea_photos ?? [],
      demo_photos: body.demo_photos ?? [],
      website: body.website ?? '',
      instagram: body.instagram ?? '',
    })
    revalidatePublic()
    return NextResponse.json({ id: String(doc._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
