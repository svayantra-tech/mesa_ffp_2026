import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function extractFolderId(input: string): string | null {
  const m = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

/**
 * GET /api/admin/drive-folder?url=DRIVE_FOLDER_URL
 * Returns { urls: string[] } — thumbnail URLs for all images in the folder.
 * Requires GOOGLE_API_KEY env var (free, no OAuth needed for public folders).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || ''

  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  const folderId = extractFolderId(url)
  if (!folderId) {
    return NextResponse.json(
      { error: 'Not a Drive folder URL. Paste a link like: drive.google.com/drive/folders/...' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GOOGLE_API_KEY not configured. Add a free Google API key to your Vercel env vars to enable folder import. See: console.cloud.google.com → APIs → Drive API → Credentials.',
      },
      { status: 501 }
    )
  }

  // List all files in the folder — one page (max 1000); images only
  const IMAGE_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  ])

  let allIds: string[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType)',
      pageSize: '1000',
      key: apiKey,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    )

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `Drive API error (${res.status}): ${body.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const data = await res.json() as {
      files: { id: string; name: string; mimeType: string }[]
      nextPageToken?: string
    }

    const imageIds = (data.files ?? [])
      .filter((f) => IMAGE_TYPES.has(f.mimeType))
      .map((f) => f.id)

    allIds = allIds.concat(imageIds)
    pageToken = data.nextPageToken
  } while (pageToken)

  if (allIds.length === 0) {
    return NextResponse.json(
      { error: 'No images found in this folder. Make sure the folder is shared as "Anyone with the link can view".' },
      { status: 404 }
    )
  }

  const urls = allIds.map((id) => `https://drive.google.com/thumbnail?id=${id}&sz=w1600`)
  return NextResponse.json({ urls, count: urls.length })
}
