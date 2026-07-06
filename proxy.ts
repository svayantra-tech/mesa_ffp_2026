import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifySession } from '@/lib/admin-auth'
import { isValidCohort } from '@/lib/cohorts'

const ADMIN_SUFFIX = '/admin-mesa-portfolio-6300'
const LOGIN_API = '/api/admin/login'
const PREVIEW_COOKIE_MAX_AGE = 6 * 60 * 60 // 6 hours

function previewCookieName(cohort: string) {
  return `ffp_preview_${cohort}`
}

/**
 * Forward the request to the app with a pinned x-pathname (so the layout can
 * tell admin from public routes) and a server-computed x-preview-token. Both
 * headers are always overwritten here so a client can't spoof them.
 */
function withPathname(request: NextRequest, pathname: string, previewToken = ''): NextResponse {
  const headers = new Headers(request.headers)
  headers.set('x-pathname', pathname)
  headers.set('x-preview-token', previewToken)
  return NextResponse.next({ request: { headers } })
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── API auth gate (always allow login endpoint) ───────────────────────────
  if (pathname.startsWith('/api/admin')) {
    if (pathname === LOGIN_API) return NextResponse.next()
    const session = await verifySession(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.next()
  }

  const segments = pathname.split('/').filter(Boolean)

  // ── Root: / → app/page.tsx handles DB-aware redirect to latest enabled cohort
  if (segments.length === 0) {
    return NextResponse.next()
  }

  const first = segments[0]

  // ── Known cohort: enforce admin auth, then pass through ──────────────────
  if (isValidCohort(first)) {
    const rest = pathname.slice(`/${first}`.length) || '/'
    if (rest.startsWith(ADMIN_SUFFIX)) {
      const isLoginPage = rest === `${ADMIN_SUFFIX}/login` || rest.startsWith(`${ADMIN_SUFFIX}/login/`)
      if (!isLoginPage) {
        const session = await verifySession(request.cookies.get(ADMIN_COOKIE)?.value)
        if (!session) {
          return NextResponse.redirect(
            new URL(`/${first}${ADMIN_SUFFIX}/login`, request.url)
          )
        }
      }
    }

    // Preview access: a ?preview=TOKEN query (or a previously-set preview cookie)
    // lets the layout render a still-hidden cohort. The middleware can't reach the
    // DB (Edge), so it only forwards the candidate token; the layout validates it.
    const cookieName = previewCookieName(first)
    const queryToken = request.nextUrl.searchParams.get('preview') ?? ''
    const cookieToken = request.cookies.get(cookieName)?.value ?? ''
    const effectiveToken = queryToken || cookieToken

    // Forward pathname (admin-vs-public) + the candidate preview token to the layout
    const res = withPathname(request, pathname, effectiveToken)

    // On first use via the query param, drop a short-lived cookie so the visitor
    // keeps preview access as they click around without re-appending ?preview=.
    if (queryToken) {
      res.cookies.set(cookieName, queryToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: PREVIEW_COOKIE_MAX_AGE,
      })
    }
    return res
  }

  // ── Backwards-compat redirects for old single-cohort URLs ────────────────

  // /admin-mesa-portfolio-6300/* → /cohort-1/admin-mesa-portfolio-6300/*
  if (first === 'admin-mesa-portfolio-6300') {
    return NextResponse.redirect(new URL(`/cohort-1${pathname}`, request.url), 308)
  }

  // /directory or /directory/* → /cohort-1/directory/*
  if (first === 'directory') {
    return NextResponse.redirect(new URL(`/cohort-1${pathname}`, request.url), 308)
  }

  // /{slug} (any other single segment) → /cohort-1/{slug}
  // These are old shared portfolio links that must keep working.
  if (segments.length === 1) {
    return NextResponse.redirect(new URL(`/cohort-1/${first}`, request.url), 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|assets/|mesa-logos/|ai-tools/|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
}
