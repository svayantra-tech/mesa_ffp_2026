'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

// react-pdf / pdfjs reference browser-only globals (DOMMatrix) at import time,
// so the viewer must never be imported on the server. It also pulls a ~1 MB
// worker, so we defer the whole thing until the certificate scrolls into view.
const CertificateViewer = dynamic(() => import('./CertificateViewer'), {
  ssr: false,
  loading: () => null,
})

export default function CertificateViewerClient({ certUrl }: { certUrl: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: '100%', minHeight: 520 }}>
      {inView && <CertificateViewer certUrl={certUrl} />}
    </div>
  )
}
