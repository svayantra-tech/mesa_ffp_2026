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

// Multiple-image field (flea_photos, demo_photos, ad_statics): present assets
// as a grid + an "upload asset" tile. Supports remove + reorder.
export default function AssetListField({ label, values, onChange, accept = 'image/*', hint, max, allowPasteUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await uploadFile(file))
      }
      let next = [...values, ...uploaded]
      if (max) next = next.slice(0, max)
      onChange(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
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
              {/* Admin preview of an arbitrary user-pasted url — next/image can't
                  optimize unknown hosts, so a plain img is correct here. */}
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
          {!atMax && (
            <div className="asset-add-tile" onClick={() => !busy && inputRef.current?.click()}>
              {busy ? <span className="admin-spinner" /> : <span style={{ fontSize: 22 }}>＋</span>}
              <span>Upload asset</span>
            </div>
          )}
        </div>
        {allowPasteUrl && !atMax && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              className="admin-input"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="...or paste an existing url (e.g. Instagram post)"
            />
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => {
                const u = normalizeImageUrl(pasteUrl.trim())
                if (!u) return
                onChange([...values, u])
                setPasteUrl('')
              }}
              disabled={!pasteUrl.trim()}
            >
              Add url
            </button>
          </div>
        )}
        {hint && <p className="asset-hint">{hint}</p>}
        {error && <p className="admin-toast err" style={{ marginTop: 6 }}>{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  )
}
