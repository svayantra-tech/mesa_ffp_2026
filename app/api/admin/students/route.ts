import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Student } from '@/lib/models/Student'
import { listStudents, revalidatePublic } from '@/lib/admin-data'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(await listStudents())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { slug, name, email = '', certificate_url = '', brand_id = null } = body
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }
  await connectDB()
  try {
    const doc = await Student.create({
      slug,
      name,
      email,
      certificate_url,
      brand_id: brand_id || null,
    })
    revalidatePublic()
    return NextResponse.json({ id: String(doc._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
