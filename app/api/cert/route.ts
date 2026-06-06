import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return new NextResponse('Invalid Drive URL', { status: 400 })

  const fileId = match[1]
  const res = await fetch(
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    { redirect: 'follow' }
  )
  if (!res.ok) return new NextResponse('Failed to fetch PDF', { status: 502 })

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
