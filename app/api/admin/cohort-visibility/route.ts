import { NextResponse } from 'next/server'
import { isValidCohort } from '@/lib/cohorts'
import { getCohortEnabled, setCohortEnabled } from '@/lib/cohort-visibility'
import { revalidatePublic } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { cohort, enabled } = body

  if (!cohort || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'cohort and enabled required' }, { status: 400 })
  }
  if (!isValidCohort(cohort)) {
    return NextResponse.json({ error: 'Unknown cohort' }, { status: 400 })
  }

  await setCohortEnabled(cohort, enabled)
  revalidatePublic(cohort)

  const newState = await getCohortEnabled(cohort)
  return NextResponse.json({ cohort, enabled: newState })
}
