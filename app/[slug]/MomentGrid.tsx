'use client'

import { useState } from 'react'
import Image from 'next/image'

type Photo = { src: string; caption: string }

export default function MomentGrid({ photos }: { photos: Photo[] }) {
  const [errored, setErrored] = useState<Set<number>>(new Set())

  const visiblePhotos = photos.filter((_, i) => !errored.has(i))

  if (visiblePhotos.length === 0) return null

  return (
    <div className={`moments-grid count-${visiblePhotos.length}`}>
      {photos.map((photo, i) => {
        if (errored.has(i)) return null
        return (
          <div key={i} className="moment-item">
            <div className="moment-img">
              <Image
                src={photo.src}
                alt={photo.caption}
                width={0}
                height={0}
                sizes="(max-width: 768px) 100vw, 33vw"
                quality={90}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                onError={() => setErrored((prev) => new Set([...prev, i]))}
              />
            </div>
            <div className="moment-caption">{photo.caption}</div>
          </div>
        )
      })}
    </div>
  )
}
