import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Brand } from '@/lib/models/Brand'
import { getBrand, revalidatePublic } from '@/lib/admin-data'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

const STRING_FIELDS = ['slug', 'name', 'description', 'website', 'instagram'] as const
const NUMBER_FIELDS = ['revenue', 'customers'] as const
const ARRAY_FIELDS = ['awards', 'videos', 'ad_statics', 'flea_photos', 'demo_photos'] as const

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const brand = await getBrand(id)
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(brand)
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  for (const k of STRING_FIELDS) if (k in body) update[k] = body[k] ?? ''
  for (const k of NUMBER_FIELDS) if (k in body) update[k] = Number(body[k]) || 0
  for (const k of ARRAY_FIELDS) {
    if (k in body) update[k] = Array.isArray(body[k]) ? body[k].filter((v: unknown) => v != null && v !== '') : []
  }

  await connectDB()
  try {
    const doc = await Brand.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePublic()
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  await connectDB()
  const doc = await Brand.findByIdAndDelete(id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePublic()
  return NextResponse.json({ ok: true })
}
