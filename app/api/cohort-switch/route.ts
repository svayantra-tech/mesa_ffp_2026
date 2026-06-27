import { NextRequest, NextResponse } from 'next/server'
import { isValidCohort } from '@/lib/cohorts'
import { getStudentBySlug } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const to = searchParams.get('to') ?? ''
  const slug = searchParams.get('slug') ?? ''

  if (!isValidCohort(to)) {
    return NextResponse.json({ error: 'Invalid cohort' }, { status: 400 })
  }

  if (!slug) {
    return NextResponse.json({ url: `/${to}` })
  }

  const student = await getStudentBySlug(to, slug)
  return NextResponse.json({ url: student ? `/${to}/${slug}` : `/${to}` })
}
