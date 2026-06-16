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

// Render a 3-column checkerboard; pad with empty squares so the board stays a
// clean rectangle even with an odd number of tools.
function Board({ tools }: { tools: { name: string; img: string }[] }) {
  const cells = Math.ceil(tools.length / 3) * 3
  return (
    <div className="chess-frame">
      <div className="chess-board">
        {Array.from({ length: cells }, (_, i) => {
          const row = Math.floor(i / 3)
          const col = i % 3
          const light = (row + col) % 2 === 0
          const tool = tools[i]
          return (
            <div key={i} className={`chess-sq ${light ? 'light' : 'dark'}`}>
              {tool && (
                <>
                  <div className="chess-piece">
                    <img src={tool.img} alt={tool.name} />
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
        <Board tools={LEFT_TOOLS} />

        <div className="chess-center">
          <div className="chess-eyebrow">AI Tools &middot; FFP Curriculum</div>
          <h2 className="chess-title">AI Tools <span>Used</span></h2>
          <p className="chess-sub">
            Every move calculated. Students played 11 AI tools to build brands, create content,
            launch websites, and grow their real business.
          </p>
          <div className="chess-badge">AI Tools &middot; FFP Curriculum</div>
        </div>

        <Board tools={RIGHT_TOOLS} />
      </div>
    </section>
  )
}
