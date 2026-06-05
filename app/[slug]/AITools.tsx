'use client'

import { useState } from 'react'

const ALL_TOOLS = [
  { name: 'Lovable', letter: '♥' },
  { name: 'Canva AI', img: 'https://cdn.simpleicons.org/canva/00C4CC' },
  { name: 'ChatGPT', img: 'https://cdn.simpleicons.org/openai/ffffff' },
  { name: 'Gemini', letter: 'G' },
  { name: 'Google Flow', letter: 'F' },
  { name: 'Pomelli', letter: 'P' },
  { name: 'Shopify AI', img: 'https://cdn.simpleicons.org/shopify/96BF48' },
  { name: 'Meta AI', img: 'https://cdn.simpleicons.org/meta/0082FB' },
  { name: 'Instagram Edits', img: 'https://cdn.simpleicons.org/instagram/E1306C' },
  { name: 'Veo 3', letter: 'V3' },
  { name: 'Claude', letter: 'C' },
]

const LEFT_TOOLS = ALL_TOOLS.slice(0, 6)
const RIGHT_TOOLS = ALL_TOOLS.slice(6)

const SIZE = 400
const CX = SIZE / 2
const CY = SIZE / 2
const R = 175

function polar(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function pieSlice(startA: number, endA: number): string {
  const s = polar(startA, R)
  const e = polar(endA, R)
  const large = endA - startA > Math.PI ? 1 : 0
  return `M${CX},${CY} L${s.x},${s.y} A${R},${R} 0 ${large} 1 ${e.x},${e.y} Z`
}

type Tool = { name: string; letter?: string; img?: string }

function Wheel({ tools, wheelId, onHover }: {
  tools: Tool[]
  wheelId: string
  onHover: (name: string | null) => void
}) {
  const n = tools.length
  const seg = (2 * Math.PI) / n
  const off = -Math.PI / 2

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="ai-wheel-svg">
      <defs>
        {tools.map((_, i) => {
          const s = off + i * seg
          const e = off + (i + 1) * seg
          const tr = R * 0.73
          const pad = seg * 0.12
          const p1 = polar(s + pad, tr)
          const p2 = polar(e - pad, tr)
          const large = (e - pad) - (s + pad) > Math.PI ? 1 : 0
          return (
            <path
              key={i}
              id={`${wheelId}-a${i}`}
              d={`M${p1.x},${p1.y} A${tr},${tr} 0 ${large} 1 ${p2.x},${p2.y}`}
              fill="none"
            />
          )
        })}
      </defs>

      {tools.map((tool, i) => {
        const s = off + i * seg
        const e = off + (i + 1) * seg
        const mid = (s + e) / 2
        const isCrimson = i % 2 === 0
        const lp = polar(mid, R * 0.44)

        return (
          <g
            key={i}
            className="ai-seg"
            onMouseEnter={() => onHover(tool.name)}
            onMouseLeave={() => onHover(null)}
          >
            <path
              d={pieSlice(s, e)}
              fill={isCrimson ? '#BA3B41' : '#1a2a2a'}
              stroke="rgba(255,251,243,0.06)"
              strokeWidth="1"
            />
            {tool.letter ? (
              <text
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="20"
                fontWeight="800"
                fontFamily="Manrope, sans-serif"
              >
                {tool.letter}
              </text>
            ) : (
              <image
                href={tool.img}
                x={lp.x - 13}
                y={lp.y - 13}
                width="26"
                height="26"
              />
            )}
            <text
              fill="rgba(255,251,243,0.85)"
              fontSize={n > 8 ? '8' : '9.5'}
              fontWeight="700"
              fontFamily="Manrope, sans-serif"
              letterSpacing="0.06em"
            >
              <textPath
                href={`#${wheelId}-a${i}`}
                startOffset="50%"
                textAnchor="middle"
              >
                {tool.name.toUpperCase()}
              </textPath>
            </text>
          </g>
        )
      })}

      <circle
        cx={CX}
        cy={CY}
        r="30"
        fill="#0F1919"
        stroke="rgba(255,251,243,0.08)"
        strokeWidth="1"
      />
    </svg>
  )
}

function WheelContainer({ tools, wheelId, dir, className }: {
  tools: Tool[]
  wheelId: string
  dir: 'cw' | 'ccw'
  className: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className={`ai-wheel-col ${className}`}>
      <div className="ai-wheel-wrap">
        <div className={`ai-wheel-spin ${dir === 'cw' ? 'ai-spin-cw' : 'ai-spin-ccw'}`}>
          <Wheel tools={tools} wheelId={wheelId} onHover={setHovered} />
        </div>
        <div className="ai-wheel-hub">
          {hovered ? (
            <span className="ai-hub-name">{hovered}</span>
          ) : (
            <span className="ai-hub-label">AI</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AITools() {
  return (
    <section id="ai" className="ai-wheels-section">
      <div className="ai-wheels-layout">
        <WheelContainer tools={LEFT_TOOLS} wheelId="left" dir="cw" className="ai-wheel-desktop" />

        <div className="ai-center">
          <div className="ai-center-tag">12 &mdash; AI Tools &middot; FFP Curriculum</div>
          <h2 className="ai-center-heading">AI Tools Used</h2>
          <p className="ai-center-sub">
            Students Leveraged 10+ AI Tools to Build Brands, Create Content, Launch Websites, and Grow Their Real Business
          </p>
          <div className="ai-tool-pill">11 Tools &middot; FFP Curriculum</div>
        </div>

        <WheelContainer tools={RIGHT_TOOLS} wheelId="right" dir="ccw" className="ai-wheel-desktop" />
        <WheelContainer tools={ALL_TOOLS} wheelId="all" dir="cw" className="ai-wheel-mobile" />
      </div>
    </section>
  )
}
