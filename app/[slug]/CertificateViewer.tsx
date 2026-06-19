'use client'

import { useState } from 'react'

function extractDriveId(url: string): string | null {
  if (!url) return null
  // https://drive.google.com/file/d/<ID>/view
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  // https://drive.google.com/open?id=<ID>
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
}

export default function CertificateViewer({ certUrl }: { certUrl: string }) {
  const [errored, setErrored] = useState(false)

  const fileId = extractDriveId(certUrl)

  if (!fileId || errored) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          background: '#FBF4D7',
          border: '0.5px dashed rgba(186,59,65,0.25)',
          padding: '24px 32px',
          textAlign: 'center',
          color: 'rgba(15,25,25,0.45)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Certificate unavailable — use the Download button below.
      </div>
    )
  }

  const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl}
      alt="Programme Certificate"
      className="cert-canvas"
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}
