'use client'

import { useRef, useState } from 'react'
import { uploadFile } from './upload'
import { normalizeImageUrl } from '@/lib/normalize'

type Props = {
  label: string
  values: string[]
  onChange: (urls: string[]) => void
  accept?: string
  hint?: string
  max?: number
  allowPasteUrl?: boolean
}

export default function AssetListField({
  label,
  values,
  onChange,
  accept = 'image/*',
  hint,
  max,
  allowPasteUrl,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadFile(file)
        uploaded.push(url)
      }
      let next = [...values, ...uploaded]
      if (max) next = next.slice(0, max)
      onChange(next)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setError(msg)
      console.error('[AssetListField] upload error:', msg)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= values.length) return
    const next = [...values]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  function addPasteUrl() {
    const raw = pasteUrl.trim()
    if (!raw) return
    const u = normalizeImageUrl(raw)
    if (!u) return
    let next = [...values, u]
    if (max) next = next.slice(0, max)
    onChange(next)
    setPasteUrl('')
  }

  const atMax = max ? values.length >= max : false

  return (
    <div className="admin-field">
      <label className="admin-label">
        {label} {max ? `(${values.length}/${max})` : `(${values.length})`}
      </label>
      <div className="asset-field">
        <div className="asset-grid">
          {values.map((url, i) => (
            <div key={`${url}-${i}`} className="asset-thumb">
              {/* Plain <img> — admin previews arbitrary host URLs */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`asset ${i + 1}`} />
              <button type="button" className="asset-thumb-x" onClick={() => remove(i)} title="Remove">
                ×
              </button>
              <div className="asset-thumb-reorder">
                <button type="button" onClick={() => move(i, -1)} title="Move left">‹</button>
                <button type="button" onClick={() => move(i, 1)} title="Move right">›</button>
              </div>
            </div>
          ))}

          {/* Upload tile — shown while not at max */}
          {!atMax && (
            <div
              className="asset-add-tile"
              onClick={() => !uploading && inputRef.current?.click()}
              style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? (
                <>
                  <span className="admin-spinner" />
                  <span style={{ fontSize: 11 }}>Uploading…</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 22 }}>＋</span>
                  <span>Upload</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Paste-URL row */}
        {allowPasteUrl && !atMax && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              className="admin-input"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addPasteUrl() }
              }}
              placeholder="Paste a direct image URL or Google Drive share link"
            />
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={addPasteUrl}
              disabled={!pasteUrl.trim()}
            >
              Add URL
            </button>
          </div>
        )}

        {hint && <p className="asset-hint">{hint}</p>}
        {error && (
          <p className="admin-toast err" style={{ marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          multiple={!max || max > 1}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  )
}
