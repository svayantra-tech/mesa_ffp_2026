import { NextResponse } from 'next/server'
import { createBrand, listBrands, revalidatePublic } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  return NextResponse.json(await listBrands(cohort))
}

export async function POST(request: Request) {
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  if (!body.slug || !body.name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }
  try {
    const doc = await createBrand(cohort, body)
    revalidatePublic(cohort)
    return NextResponse.json({ id: String(doc._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
