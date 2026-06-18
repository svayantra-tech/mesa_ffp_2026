'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export default function CertificateViewer({ certUrl }: { certUrl: string }) {
  const [loaded, setLoaded] = useState(false)

  const proxyUrl = `/api/cert?url=${encodeURIComponent(certUrl)}`

  return (
    <div
      style={{
        width: '100%',
        background: loaded ? 'transparent' : '#FBF4D7',
        minHeight: loaded ? undefined : 520,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      }}
    >
      <Document
        file={proxyUrl}
        loading={null}
        error={null}
        onLoadSuccess={() => setLoaded(true)}
        onLoadError={(err) => console.error('PDF load error:', err)}
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
