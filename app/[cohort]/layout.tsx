import { notFound } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { isValidCohort } from '@/lib/cohorts'
import { getCohortEnabled, verifyPreviewToken } from '@/lib/cohort-visibility'
import { previewCookieName } from '@/lib/preview-cookie'
import { ADMIN_COOKIE, verifySession } from '@/lib/admin-auth'

const ADMIN_SUFFIX = '/admin-mesa-portfolio-6300'

// Evaluate the visibility/preview gate on every request (never cache the notFound).
export const dynamic = 'force-dynamic'

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
    if (!enabled) {
      // A disabled cohort is still viewable in preview mode via either bypass:
      //  1. a valid admin session cookie (logged into any cohort's admin panel), or
      //  2. a valid preview token (from a ?preview=TOKEN link, forwarded by proxy.ts).
      // Neither changes the public enabled state — everyone else still gets a 404.
      const cookieStore = await cookies()
      const isAdmin = !!(await verifySession(cookieStore.get(ADMIN_COOKIE)?.value))
      // Read the token from the cookie FIRST (reliable on every nested route once
      // set), falling back to the proxy-forwarded header for the first ?preview=
      // request before the cookie round-trips.
      const previewToken =
        cookieStore.get(previewCookieName(cohort))?.value || headersList.get('x-preview-token') || ''
      const hasPreview = isAdmin || (await verifyPreviewToken(cohort, previewToken))
      if (!hasPreview) notFound()
    }
  }

  return <>{children}</>
}
