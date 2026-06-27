'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AssetListField from '@/app/admin-mesa-portfolio-6300/_components/AssetListField'

type Media = { key: string; value: string }

type VentureRow = {
  id: string
  slug: string
  name: string
  awards: string[]
  feature_photo: string
}

const DEMO_KEYS = [1, 2, 3, 4, 5, 6].map((n) => `demo_photo_${n}`)

function normalizeImageUrl(input: string): string {
  if (!input) return ''
  const url = input.trim()
  if (!url.startsWith('http')) return url
  if (url.includes('drive.google.com')) {
    const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
              url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
              url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`
  }
  return url
}

function DriveImport({ onImport }: { onImport: (urls: string[]) => void }) {
  const [driveUrl, setDriveUrl] = useState('')
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'ok' | 'err'; msg: string }>({ type: 'idle', msg: '' })

  async function importDrive() {
    const url = driveUrl.trim()
    if (!url) return

    if (url.includes('/file/d/') || (url.includes('drive.google.com') && !url.includes('/folders/'))) {
      const converted = normalizeImageUrl(url)
      if (converted !== url) {
        onImport([converted])
        setDriveUrl('')
        setStatus({ type: 'ok', msg: 'Added 1 photo — click Save to publish.' })
        return
      }
    }

    if (url.includes('/folders/')) {
      setStatus({ type: 'loading', msg: 'Importing folder…' })
      try {
        const res = await fetch(`/api/admin/drive-folder?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Import failed')
        onImport(data.urls as string[])
        setDriveUrl('')
        setStatus({ type: 'ok', msg: `Added ${data.count} photo${data.count === 1 ? '' : 's'} — click Save to publish.` })
      } catch (e) {
        setStatus({ type: 'err', msg: e instanceof Error ? e.message : 'Import failed' })
      }
      return
    }

    setStatus({ type: 'err', msg: 'Paste a Google Drive file or folder link.' })
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '.5px solid rgba(15,25,25,0.08)' }}>
      <div className="admin-label" style={{ marginBottom: 6 }}>Paste any Google Drive link</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="admin-input"
          style={{ flex: 1 }}
          placeholder="drive.google.com/file/d/… or /drive/folders/…"
          value={driveUrl}
          onChange={(e) => { setDriveUrl(e.target.value); setStatus({ type: 'idle', msg: '' }) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), importDrive())}
        />
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={importDrive}
          disabled={status.type === 'loading' || !driveUrl.trim()}
          style={{ flexShrink: 0 }}
        >
          {status.type === 'loading' ? <span className="admin-spinner" /> : 'Add'}
        </button>
      </div>
      {status.msg && (
        <p className="asset-hint" style={{ marginTop: 6, color: status.type === 'err' ? '#BA3B41' : status.type === 'ok' ? '#2a7a4f' : undefined }}>
          {status.msg}
        </p>
      )}
      <p className="asset-hint" style={{ marginTop: 4 }}>
        Single file or shared folder. Folder import requires <code>GOOGLE_API_KEY</code> in Vercel env.
      </p>
    </div>
  )
}

function parseJsonUrls(s?: string): string[] {
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === 'string') : []
  } catch {
    return []
  }
}

export default function LandingForm({
  cohort,
  media,
  ventures,
}: {
  cohort: string
  media: Media[]
  ventures: VentureRow[]
}) {
  const router = useRouter()
  const map = Object.fromEntries(media.map((m) => [m.key, m.value]))

  const [highlightPhotos, setHighlightPhotos] = useState<string[]>(parseJsonUrls(map['landing_highlights']))
  const [fleaPhotos, setFleaPhotos] = useState<string[]>(() => {
    const fromNew = parseJsonUrls(map['landing_flea_photos'])
    if (fromNew.length > 0) return fromNew
    return [1,2,3,4,5,6].map(n => map[`flea_photo_${n}`]).filter(Boolean) as string[]
  })
  const [demoPhotos, setDemoPhotos] = useState<string[]>(DEMO_KEYS.map((k) => map[k]).filter(Boolean))
  const [heroImage, setHeroImage] = useState<string[]>(parseJsonUrls(map['landing_hero_image']))
  const [demoDayImages, setDemoDayImages] = useState<string[]>(parseJsonUrls(map['landing_demo_day']))
  const [ffp2027Video, setFfp2027Video] = useState(map['landing_ffp2027_video_id'] || '')
  const [photoMap, setPhotoMap] = useState<Record<string, string>>(
    () => Object.fromEntries(ventures.map((v) => [v.id, v.feature_photo]))
  )
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const items: Media[] = [
      { key: 'landing_highlights', value: JSON.stringify(highlightPhotos) },
      { key: 'landing_flea_photos', value: JSON.stringify(fleaPhotos) },
      ...DEMO_KEYS.map((k, i) => ({ key: k, value: demoPhotos[i] || '' })),
      { key: 'landing_hero_image', value: JSON.stringify(heroImage) },
      { key: 'landing_demo_day', value: JSON.stringify(demoDayImages) },
      { key: 'landing_ffp2027_video_id', value: ffp2027Video.trim() },
    ]
    try {
      const res = await fetch(`/api/admin/landing?cohort=${cohort}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')

      await Promise.all(
        ventures.map((v) =>
          fetch(`/api/admin/brands/${v.id}?cohort=${cohort}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature_photo: photoMap[v.id] ?? '' }),
          }).then((r) => {
            if (!r.ok) throw new Error(`Failed to save photo for ${v.name}`)
          })
        )
      )

      setMsg({ ok: true, text: 'Saved & published.' })
      router.refresh()
    } catch (e2) {
      setMsg({ ok: false, text: e2 instanceof Error ? e2.message : 'Save failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="admin-card">
        <h2 className="admin-card-title">Hero Background Image</h2>
        <AssetListField
          label="Hero image (1 max)"
          values={heroImage}
          onChange={setHeroImage}
          max={1}
          allowPasteUrl
          hint="Shown full-bleed behind the headline, masked to dissolve left. Landscape photos work best."
        />
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Demo Day</h2>
        <AssetListField
          label="Carousel images"
          values={demoDayImages}
          onChange={setDemoDayImages}
          allowPasteUrl
          hint="Auto-rotating carousel shown in the Demo Day section. Section is hidden when empty — add at least one image to make it visible."
        />
        <AssetListField
          label="Side panel photos (optional — first 2 shown)"
          values={demoPhotos}
          onChange={setDemoPhotos}
          max={6}
          allowPasteUrl
          hint="Small portrait-style photo slots to the right of the carousel. Only the first 2 appear on the page."
        />
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Highlights &amp; Moments</h2>
        <AssetListField
          label="Photos"
          values={highlightPhotos}
          onChange={setHighlightPhotos}
          allowPasteUrl
          hint="Auto-rotating carousel shown between Demo Day and Top Performers. Talent Night, Scribble Day, etc. Section is hidden when empty."
        />
        <DriveImport onImport={(urls) => setHighlightPhotos((prev) => [...prev, ...urls])} />
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Flea Market</h2>
        <AssetListField
          label="Photos"
          values={fleaPhotos}
          onChange={setFleaPhotos}
          allowPasteUrl
          hint="Shown in the infinite scrolling strip on the landing page. Add as many as you like — the strip loops them all."
        />
        <DriveImport onImport={(urls) => setFleaPhotos((prev) => [...prev, ...urls])} />
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">FFP 2027 — promo video</h2>
        <div className="admin-field">
          <label className="admin-label">YouTube link or video ID</label>
          <input
            className="admin-input"
            value={ffp2027Video}
            onChange={(e) => setFfp2027Video(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or mIp5evPlruY"
          />
          <p className="asset-hint">Shown as a click-to-play thumbnail beside the FFP 2027 CTA on the landing page.</p>
        </div>
      </div>

      {ventures.length > 0 && (
        <div className="admin-card">
          <h2 className="admin-card-title">Top Performers &amp; Recognition — venture photos</h2>
          <p className="admin-sub" style={{ marginBottom: 20 }}>
            One photo per venture. Shown on the landing page cards (4:3 ratio). Ventures without a photo show a plain gradient placeholder.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {ventures.map((v) => (
              <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start', paddingBottom: 24, borderBottom: '.5px solid rgba(15,25,25,0.08)' }}>
                <div>
                  <div className="admin-label" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{v.name}</div>
                  {v.awards.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {v.awards.map((a, i) => (
                        <span key={i} style={{ display: 'inline-flex', padding: '2px 8px', background: 'rgba(186,59,65,0.08)', border: '.5px solid rgba(186,59,65,0.2)', borderRadius: 4, fontSize: 9, fontWeight: 700, color: '#BA3B41', letterSpacing: '.07em', textTransform: 'uppercase' }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <AssetListField
                  label=""
                  values={photoMap[v.id] ? [photoMap[v.id]] : []}
                  onChange={(urls) => setPhotoMap((prev) => ({ ...prev, [v.id]: urls[0] || '' }))}
                  max={1}
                  allowPasteUrl
                  hint=""
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? <span className="admin-spinner" /> : null}
          Save landing media
        </button>
        {msg && <span className={`admin-toast ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
      </div>
    </form>
  )
}
