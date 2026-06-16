'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AssetListField from './AssetListField'
import { extractYouTubeId } from '@/lib/normalize'

type Media = { key: string; value: string }

const FLEA_KEYS = [1, 2, 3, 4, 5, 6].map((n) => `flea_photo_${n}`)
const DEMO_KEYS = [1, 2, 3, 4, 5, 6].map((n) => `demo_photo_${n}`)

export default function LandingForm({ media }: { media: Media[] }) {
  const router = useRouter()
  const map = Object.fromEntries(media.map((m) => [m.key, m.value]))

  const [demoVideo, setDemoVideo] = useState(map['demo_day_video_id'] || '')
  const [fleaVideo, setFleaVideo] = useState(map['flea_market_video_id'] || '')
  const [fleaPhotos, setFleaPhotos] = useState<string[]>(FLEA_KEYS.map((k) => map[k]).filter(Boolean))
  const [demoPhotos, setDemoPhotos] = useState<string[]>(DEMO_KEYS.map((k) => map[k]).filter(Boolean))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const items: Media[] = [
      { key: 'demo_day_video_id', value: extractYouTubeId(demoVideo) },
      { key: 'flea_market_video_id', value: extractYouTubeId(fleaVideo) },
      ...FLEA_KEYS.map((k, i) => ({ key: k, value: fleaPhotos[i] || '' })),
      ...DEMO_KEYS.map((k, i) => ({ key: k, value: demoPhotos[i] || '' })),
    ]
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
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
        <h2 className="admin-card-title">Demo Day</h2>
        <div className="admin-field">
          <label className="admin-label">Demo Day video (YouTube link or id)</label>
          <input className="admin-input" value={demoVideo} onChange={(e) => setDemoVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          {extractYouTubeId(demoVideo) && (
            <div className="video-embed">
              <iframe src={`https://www.youtube.com/embed/${extractYouTubeId(demoVideo)}`} title="demo day" allow="encrypted-media" />
            </div>
          )}
        </div>
        <AssetListField label="Demo Day photos" values={demoPhotos} onChange={setDemoPhotos} max={6} allowPasteUrl hint="Up to 6. The landing shows the first 4." />
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Flea Market</h2>
        <div className="admin-field">
          <label className="admin-label">Flea Market video (YouTube link or id)</label>
          <input className="admin-input" value={fleaVideo} onChange={(e) => setFleaVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
        <AssetListField label="Flea Market photos" values={fleaPhotos} onChange={setFleaPhotos} max={6} allowPasteUrl hint="Up to 6, shown in the landing marquee." />
      </div>

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
