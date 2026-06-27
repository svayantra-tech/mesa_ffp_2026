import { NextResponse } from 'next/server'
import { getStudent, updateStudent, deleteStudent, revalidatePublic } from '@/lib/db/queries'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  const student = await getStudent(cohort, id)
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(student)
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  try {
    const doc = await updateStudent(cohort, id, body)
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
  const doc = await deleteStudent(cohort, id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePublic(cohort)
  return NextResponse.json({ ok: true })
}
