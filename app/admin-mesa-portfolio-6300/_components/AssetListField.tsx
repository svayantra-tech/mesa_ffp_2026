'use client'

import { useRef, useState } from 'react'
import { uploadFile } from './upload'
import { normalizeImageUrl } from '@/lib/normalize'

const MAX_LONG_EDGE = 2400
const JPEG_QUALITY = 0.85
const SKIP_RESIZE_UNDER_BYTES = 3 * 1024 * 1024 // skip re-encode if already <3MB

/**
 * Read EXIF orientation from a JPEG ArrayBuffer (only parses enough of the
 * EXIF structure to find the Orientation tag — no dependency needed).
 */
function readExifOrientation(buf: ArrayBuffer): number {
  const view = new DataView(buf)
  if (view.getUint16(0) !== 0xFFD8) return 1              // not JPEG
  let offset = 2
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset)
    offset += 2
    if (marker === 0xFFE1) {                               // APP1 = EXIF
      offset += 2                                          // skip segment length
      if (view.getUint32(offset) !== 0x45786966) return 1 // "Exif"
      offset += 6                                          // skip "Exif\0\0"
      const tiffStart = offset
      const littleEndian = view.getUint16(offset) === 0x4949
      const ifdOffset = view.getUint32(offset + 4, littleEndian)
      const ifdStart = tiffStart + ifdOffset
      const entries = view.getUint16(ifdStart, littleEndian)
      for (let i = 0; i < entries; i++) {
        const entryOffset = ifdStart + 2 + i * 12
        if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
          return view.getUint16(entryOffset + 8, littleEndian)
        }
      }
      return 1
    }
    if ((marker & 0xFF00) !== 0xFF00) break
    offset += view.getUint16(offset)                       // skip this segment
  }
  return 1
}

/** Apply EXIF orientation to a canvas context before drawing the image. */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
) {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break
    case 7: ctx.transform(0, -1, -1, 0, h, w); break
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break
    default: break
  }
}

/**
 * Resize a File to MAX_LONG_EDGE on the long edge, baking in EXIF rotation,
 * and re-encode as JPEG at JPEG_QUALITY.
 * Returns a new File (renamed .jpg), or the original File if it's already
 * small enough that re-encoding would be wasteful.
 */
async function resizeImage(file: File): Promise<File> {
  if (file.size < SKIP_RESIZE_UNDER_BYTES) return file

  const buf = await file.arrayBuffer()
  const orientation = file.type === 'image/jpeg' || file.name.match(/\.jpe?g$/i)
    ? readExifOrientation(buf)
    : 1

  const blob = new Blob([buf], { type: file.type || 'image/jpeg' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })

    const srcW = img.naturalWidth
    const srcH = img.naturalHeight

    // Determine output dimensions (don't upscale)
    const longEdge = Math.max(srcW, srcH)
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1
    const outW = Math.round(srcW * scale)
    const outH = Math.round(srcH * scale)

    // Orientations 5–8 swap width/height
    const swapped = orientation >= 5 && orientation <= 8
    const canvasW = swapped ? outH : outW
    const canvasH = swapped ? outW : outH

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!

    applyOrientation(ctx, orientation, canvasW, canvasH)
    ctx.drawImage(img, 0, 0, outW, outH)

    const resized = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY),
    )

    if (!resized) return file
    const baseName = file.name.replace(/\.[^.]+$/, '')
    return new File([resized], `${baseName}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

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
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        // Resize/re-encode large images client-side before upload
        setOptimizing(true)
        const ready = await resizeImage(file).catch(() => file)
        setOptimizing(false)
        setUploading(true)
        const url = await uploadFile(ready)
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
      setOptimizing(false)
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
              onClick={() => !uploading && !optimizing && inputRef.current?.click()}
              style={{ cursor: (uploading || optimizing) ? 'default' : 'pointer', opacity: (uploading || optimizing) ? 0.7 : 1 }}
            >
              {optimizing ? (
                <>
                  <span className="admin-spinner" />
                  <span style={{ fontSize: 11 }}>Optimizing…</span>
                </>
              ) : uploading ? (
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
