'use client'

import { useState } from 'react'

export default function YoutubeEmbed({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false)
  const posterUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  return (
    <div className="yt-embed">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="Mesa Future Founders Programme"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="yt-embed-iframe"
        />
      ) : (
        <button className="yt-embed-thumb" onClick={() => setPlaying(true)} aria-label="Play video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posterUrl} alt="" className="yt-embed-poster" />
          <div className="yt-embed-play">
            <svg viewBox="0 0 68 48" width="64" height="45">
              <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.94.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.48 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000"/>
              <path d="M45 24L27 14v20" fill="#fff"/>
            </svg>
          </div>
        </button>
      )}
    </div>
  )
}
