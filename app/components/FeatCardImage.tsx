'use client'

import { useState } from 'react'

export default function FeatCardImage({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="feat-card-img" onError={() => setHidden(true)} />
  )
}
