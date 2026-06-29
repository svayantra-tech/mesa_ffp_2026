// Root / — redirect to the latest enabled cohort.
// Handled here (not middleware) so we can do a DB check.
import { redirect } from 'next/navigation'
import { getEnabledCohorts } from '@/lib/cohort-visibility'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const enabled = await getEnabledCohorts()
  const target = enabled.length > 0 ? enabled[enabled.length - 1].slug : 'cohort-1'
  redirect(`/${target}`)
}
