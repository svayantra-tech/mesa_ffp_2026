import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { isValidCohort } from '@/lib/cohorts'
import { getCohortEnabled } from '@/lib/cohort-visibility'

const ADMIN_SUFFIX = '/admin-mesa-portfolio-6300'

export default async function CohortLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ cohort: string }>
}) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isAdminRoute = pathname.includes(ADMIN_SUFFIX)

  if (!isAdminRoute) {
    const enabled = await getCohortEnabled(cohort)
    if (!enabled) notFound()
  }

  return <>{children}</>
}
