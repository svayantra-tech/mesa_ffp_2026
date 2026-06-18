import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Student } from '@/lib/models/Student'
import { listStudents, revalidatePublic } from '@/lib/admin-data'
import { normalizeImageUrl } from '@/lib/normalize'

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
      profile_photo: body.profile_photo ? normalizeImageUrl(String(body.profile_photo)) : '',
      convocation_photo: body.convocation_photo ? normalizeImageUrl(String(body.convocation_photo)) : '',
      flea_market_photo: body.flea_market_photo ? normalizeImageUrl(String(body.flea_market_photo)) : '',
      demo_day_photo: body.demo_day_photo ? normalizeImageUrl(String(body.demo_day_photo)) : '',
    })
    revalidatePublic()
    return NextResponse.json({ id: String(doc._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
