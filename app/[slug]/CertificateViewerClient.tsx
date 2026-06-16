'use client'

import dynamic from 'next/dynamic'

// react-pdf / pdfjs reference browser-only globals (DOMMatrix) at import time,
// so the viewer must never be imported on the server. Loading it via a client
// component with ssr:false keeps it out of the server bundle.
const CertificateViewer = dynamic(() => import('./CertificateViewer'), {
  ssr: false,
  loading: () => null,
})

export default function CertificateViewerClient({ certUrl }: { certUrl: string }) {
  return <CertificateViewer certUrl={certUrl} />
}
