'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

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
    <div ref={containerRef} style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#FBF4D7', minHeight: loaded ? undefined : '520px' }}>
      <Document
        file={proxyUrl}
        loading={null}
        error={null}
        onLoadSuccess={() => setLoaded(true)}
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  )
}
