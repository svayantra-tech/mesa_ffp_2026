'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const MAX_WIDTH = 820

export default function CertificateViewer({ certUrl }: { certUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // null = not yet measured; renders at MAX_WIDTH as safe fallback
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      // getBoundingClientRect is accurate even before ResizeObserver fires
      const w = el.getBoundingClientRect().width || el.offsetWidth
      if (w > 0) setContainerWidth(Math.min(w, MAX_WIDTH))
    }

    // Immediate measurement so first paint is correct, not hardcoded 800
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const proxyUrl = `/api/cert?url=${encodeURIComponent(certUrl)}`
  const pageWidth = containerWidth ?? MAX_WIDTH

  return (
    <div
      ref={containerRef}
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
        onLoadError={(err) => console.error('PDF load error:', err)}
      >
        <Page
          pageNumber={1}
          width={pageWidth}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          canvasBackground="transparent"
        />
      </Document>
    </div>
  )
}
