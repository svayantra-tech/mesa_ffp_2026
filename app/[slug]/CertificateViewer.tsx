'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export default function CertificateViewer({ certUrl }: { certUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const proxyUrl = `/api/cert?url=${encodeURIComponent(certUrl)}`

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        background: loaded ? 'transparent' : '#FBF4D7',
        minHeight: loaded ? undefined : 520,
        boxShadow: loaded ? '0 10px 40px rgba(0,0,0,0.12)' : undefined,
        lineHeight: 0,
      }}
    >
      <Document
        file={proxyUrl}
        loading={null}
        error={null}
        onLoadSuccess={() => setLoaded(true)}
        onLoadError={(err) => console.error('PDF load error:', err)}
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          canvasBackground="transparent"
        />
      </Document>
    </div>
  )
}
