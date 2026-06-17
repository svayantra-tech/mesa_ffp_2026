import Image from 'next/image'

const LEFT_TOOLS = [
  { name: 'Lovable', img: '/ai-tools/lovable.jpg' },
  { name: 'Canva AI', img: '/ai-tools/canva.png' },
  { name: 'ChatGPT', img: '/ai-tools/openai.png' },
  { name: 'Gemini', img: '/ai-tools/gemini.png' },
  { name: 'Google Flow', img: '/ai-tools/google-flow.jpg' },
  { name: 'Pomelli', img: '/ai-tools/pomelli.jpg' },
]

const RIGHT_TOOLS = [
  { name: 'Shopify AI', img: '/ai-tools/shopify.png' },
  { name: 'Meta AI', img: '/ai-tools/meta.png' },
  { name: 'Instagram Edits', img: '/ai-tools/instagram.png' },
  { name: 'Veo 3', img: '/ai-tools/veo3.png' },
  { name: 'Claude', img: '/ai-tools/claude.png' },
]

type Tool = { name: string; img: string }

// 3x3 board layouts. `true` = a tool sits here (filled in reading order),
// `false` = an empty board square. Left is a rotationally-symmetric pinwheel
// with the 3rd, centre and 7th squares left blank; right is a checkerboard.
//   Left (6):  ■ ■ ·      Right (5): ■ · ■
//              ■ · ■                 · ■ ·
//              · ■ ■                 ■ · ■
const LEFT_SLOTS = [true, true, false, true, false, true, false, true, true]
const RIGHT_SLOTS = [true, false, true, false, true, false, true, false, true]

function Board({ tools, slots }: { tools: Tool[]; slots: boolean[] }) {
  let next = 0
  const cells = slots.map((filled) => (filled ? tools[next++] ?? null : null))
  return (
    <div className="chess-frame">
      <div className="chess-board">
        {cells.map((tool, i) => {
          const light = (Math.floor(i / 3) + (i % 3)) % 2 === 0
          return (
            <div key={i} className={`chess-sq ${light ? 'light' : 'dark'}`}>
              {tool && (
                <>
                  <div className="chess-piece">
                    <Image src={tool.img} alt={tool.name} width={28} height={28} quality={100} style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
                  </div>
                  <div className="chess-name">{tool.name}</div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AITools() {
  return (
    <section id="ai" className="ai-chess-section reveal">
      <div className="chess-layout">
        <Board tools={LEFT_TOOLS} slots={LEFT_SLOTS} />

        <div className="chess-center">
          <div className="chess-eyebrow">AI Tools &middot; FFP Curriculum</div>
          <h2 className="chess-title">AI Tools <span>Used</span></h2>
          <p className="chess-sub">
            Every move calculated. Students played 10+ AI tools to build brands, create content,
            launch websites, and grow their real business.
          </p>
          <div className="chess-badge">AI Tools &middot; FFP Curriculum</div>
        </div>

        <Board tools={RIGHT_TOOLS} slots={RIGHT_SLOTS} />
      </div>
    </section>
  )
}
