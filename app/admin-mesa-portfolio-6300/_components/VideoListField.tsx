'use client'

import { useState } from 'react'
import { extractYouTubeId } from '@/lib/normalize'
import { classifyVideo, providerLabel } from '@/lib/video'

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
        {new Set(values.map((v) => classifyVideo(v)?.kind).filter(Boolean)).size > 1 && (
          <p className="admin-toast err" style={{ marginTop: 8, whiteSpace: 'normal' }}>
            This venture has both Drive and YouTube videos. Remove the Drive ones.
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
          {values.map((v, i) => {
            const c = classifyVideo(v)
            const id = c?.id ?? v
            return (
              <div key={`${v}-${i}`}>
                <div className="video-embed" style={{ width: 220, maxWidth: 220 }}>
                  {c?.kind === 'drive' ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${id}/preview`}
                      allow="encrypted-media"
                      title={`video ${i + 1}`}
                    />
                  ) : c?.kind === 'youtube' ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${id}`}
                      allow="encrypted-media"
                      title={`video ${i + 1}`}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 11, color: 'var(--a-muted)' }}>
                      Unrecognized id
                    </div>
                  )}
                </div>
                <div className="admin-actions" style={{ marginTop: 6, gap: 8, alignItems: 'center' }}>
                  {c && (
                    <span style={{
                      fontWeight: 700, fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase',
                      padding: '2px 7px', borderRadius: 4,
                      background: c.kind === 'youtube' ? 'rgba(186,59,65,0.1)' : 'rgba(47,111,224,0.12)',
                      color: c.kind === 'youtube' ? '#BA3B41' : '#2f6fe0',
                    }}>{providerLabel(c.kind)}</span>
                  )}
                  <span className="admin-list-meta" style={{ fontFamily: 'monospace', fontSize: 10 }}>{id.slice(0, 12)}{id.length > 12 ? '…' : ''}</span>
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
