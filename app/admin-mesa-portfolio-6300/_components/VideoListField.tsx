'use client'

import { useState } from 'react'

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  if (url.includes('instagram.com')) return null
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  return null
}

type Props = {
  label: string
  values: string[]
  onChange: (vals: string[]) => void
  hint?: string
  max?: number
}

// Video field: paste a YouTube link or 11-char id. Stores the id (matching how
// the portfolio renders), with a live embed preview.
export default function VideoListField({ label, values, onChange, hint, max }: Props) {
  const [draft, setDraft] = useState('')

  function add() {
    const id = extractYouTubeId(draft.trim()) || draft.trim()
    if (!id) return
    if (max && values.length >= max) return
    onChange([...values, id])
    setDraft('')
  }
  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i))
  }

  return (
    <div className="admin-field">
      <label className="admin-label">
        {label} {max ? `(${values.length}/${max})` : `(${values.length})`}
      </label>
      <div className="asset-field">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="admin-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Paste YouTube link or video id"
          />
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={add}
            disabled={!draft.trim() || (max ? values.length >= max : false)}
          >
            Add
          </button>
        </div>
        {hint && <p className="asset-hint">{hint}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
          {values.map((v, i) => {
            const id = extractYouTubeId(v) || v
            return (
              <div key={`${v}-${i}`}>
                <div className="video-embed" style={{ width: 220, maxWidth: 220 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${id}`}
                    allow="encrypted-media"
                    title={`video ${i + 1}`}
                  />
                </div>
                <div className="admin-actions" style={{ marginTop: 6 }}>
                  <span className="admin-list-meta" style={{ fontFamily: 'monospace' }}>{id}</span>
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(i)}>
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
