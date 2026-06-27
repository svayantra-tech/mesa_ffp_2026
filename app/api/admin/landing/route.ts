import { NextResponse } from 'next/server'
import { listProgramMedia, upsertProgramMedia, revalidatePublic } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })
  return NextResponse.json(await listProgramMedia(cohort))
}

export async function PUT(request: Request) {
  const cohort = new URL(request.url).searchParams.get('cohort') ?? ''
  if (!cohort) return NextResponse.json({ error: 'cohort required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const items: { key: string; value: string }[] = Array.isArray(body.items) ? body.items : []
  if (!items.length) return NextResponse.json({ error: 'No items' }, { status: 400 })

  try {
    await upsertProgramMedia(cohort, items)
    revalidatePublic(cohort)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
