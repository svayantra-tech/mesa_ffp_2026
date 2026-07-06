import { NextResponse } from 'next/server'
import { isValidCohort } from '@/lib/cohorts'
import { getPreviewToken, resetPreviewToken } from '@/lib/cohort-visibility'

export const runtime = 'nodejs'

// Guarded by the admin-session gate in proxy.ts (all /api/admin/* requires auth).
// action: 'get' (fetch/create the token) | 'reset' (rotate it, invalidating old links)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { cohort, action } = body

  if (!cohort || !isValidCohort(cohort)) {
    return NextResponse.json({ error: 'Unknown cohort' }, { status: 400 })
  }

  const token = action === 'reset' ? await resetPreviewToken(cohort) : await getPreviewToken(cohort)
  return NextResponse.json({ cohort, token })
}
