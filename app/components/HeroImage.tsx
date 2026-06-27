'use client'

import { useState } from 'react'

export default function HeroImage({ src }: { src: string }) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="hero-img"
      loading="eager"
      onError={() => setHidden(true)}
    />
  )
}
