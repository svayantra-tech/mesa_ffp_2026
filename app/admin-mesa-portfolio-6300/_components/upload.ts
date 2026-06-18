// Client helper: send a File to the admin upload API and get back the hosted URL.
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  const url = data.url
  if (typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error(
      `Upload succeeded but no URL was returned from the server. Got: ${JSON.stringify(data)}`
    )
  }
  return url
}
