import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_BASE, ADMIN_COOKIE, verifySession } from '@/lib/admin-auth'

const LOGIN_PATH = `${ADMIN_BASE}/login`
const LOGIN_API = '/api/admin/login'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminPage = pathname.startsWith(ADMIN_BASE)
  const isAdminApi = pathname.startsWith('/api/admin')
  if (!isAdminPage && !isAdminApi) return NextResponse.next()

  // Always allow the login page and login endpoint through.
  if (pathname === LOGIN_PATH || pathname === LOGIN_API) return NextResponse.next()

  const session = await verifySession(req.cookies.get(ADMIN_COOKIE)?.value)
  if (session) return NextResponse.next()

  // Unauthenticated: APIs get 401, pages redirect to login.
  if (isAdminApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = LOGIN_PATH
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/admin-mesa-portfolio-6300/:path*', '/api/admin/:path*'],
}
