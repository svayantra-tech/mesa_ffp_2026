'use client'

import { useRef, useState } from 'react'
import { uploadFile } from './upload'

type Props = {
  label: string
  value: string
  onChange: (url: string) => void
  accept?: string
  hint?: string
}

// Single image field: shows the "present asset" preview + an "upload asset"
// button that pushes the file through the FFP asset API and stores the url.
export default function AssetField({ label, value, onChange, accept = 'image/*', hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file?: File) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const url = await uploadFile(file)
      onChange(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="admin-field">
      <label className="admin-label">{label}</label>
      <div className="asset-field">
        <div className="asset-row">
          <div className="asset-preview">
            {value ? <img src={value} alt="present asset" /> : 'No asset'}
          </div>
          <div className="asset-controls">
            <p className="asset-url">{value || 'Nothing uploaded yet.'}</p>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                {busy ? <span className="admin-spinner" /> : null}
                {value ? 'Replace asset' : 'Upload asset'}
              </button>
              {value && (
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-danger"
                  onClick={() => onChange('')}
                  disabled={busy}
                >
                  Remove
                </button>
              )}
            </div>
            <input
              className="admin-input"
              style={{ marginTop: 8 }}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="...or paste a url"
            />
            {hint && <p className="asset-hint">{hint}</p>}
            {error && <p className="admin-toast err" style={{ marginTop: 6 }}>{error}</p>}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
