import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Student } from '@/lib/models/Student'
import { getStudent, revalidatePublic } from '@/lib/admin-data'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const student = await getStudent(id)
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(student)
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  for (const key of ['slug', 'name', 'email', 'certificate_url'] as const) {
    if (key in body) update[key] = body[key]
  }
  if ('brand_id' in body) update.brand_id = body.brand_id || null

  await connectDB()
  try {
    const doc = await Student.findByIdAndUpdate(id, update, { new: true })
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
  const doc = await Student.findByIdAndDelete(id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePublic()
  return NextResponse.json({ ok: true })
}
