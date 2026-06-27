import { NextResponse } from 'next/server'
import { createStudent, listStudents, revalidatePublic } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  return NextResponse.json(await listStudents(cohort))
}

export async function POST(request: Request) {
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const { slug, name, email = '', certificate_url = '', brand_id = null } = body
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }
  try {
    const doc = await createStudent(cohort, {
      slug, name, email, certificate_url,
      brand_id: brand_id || null,
      profile_photo: body.profile_photo,
      convocation_photo: body.convocation_photo,
      flea_market_photo: body.flea_market_photo,
      demo_day_photo: body.demo_day_photo,
    })
    revalidatePublic(cohort)
    return NextResponse.json({ id: String(doc._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
