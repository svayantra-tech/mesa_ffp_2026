import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 })
  return NextResponse.json({ ok: true })
}
