'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export default function CertificateViewer({ certUrl }: { certUrl: string }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const proxyUrl = `/api/cert?url=${encodeURIComponent(certUrl)}`

  if (errored) {
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
        Certificate unavailable — try the Download button below.
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        display: 'block',
        lineHeight: 0,
        borderRadius: 12,
        overflow: 'hidden',
        background: loaded ? 'transparent' : '#FBF4D7',
        minHeight: loaded ? undefined : 520,
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      }}
    >
      <Document
        file={proxyUrl}
        loading={null}
        error={null}
        onLoadSuccess={() => setLoaded(true)}
        onLoadError={(err) => {
          console.error('PDF load error:', err)
          setErrored(true)
        }}
      >
        <div className="cert-canvas">
          <Page
            pageNumber={1}
            width={1100}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            canvasBackground="transparent"
          />
        </div>
      </Document>
    </div>
  )
}
