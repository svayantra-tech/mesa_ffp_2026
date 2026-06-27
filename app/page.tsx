// Root / is handled by middleware (→ /cohort-1).
// This page is never reached in normal operation.
import { redirect } from 'next/navigation'
import { LATEST_COHORT } from '@/lib/cohorts'

export default function RootPage() {
  redirect(`/${LATEST_COHORT}`)
}
