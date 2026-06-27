import { NextResponse } from 'next/server'
import { getBrand, updateBrand, deleteBrand, revalidatePublic } from '@/lib/db/queries'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  const brand = await getBrand(cohort, id)
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(brand)
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  try {
    const doc = await updateBrand(cohort, id, body)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePublic(cohort)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  const doc = await deleteBrand(cohort, id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePublic(cohort)
  return NextResponse.json({ ok: true })
}
