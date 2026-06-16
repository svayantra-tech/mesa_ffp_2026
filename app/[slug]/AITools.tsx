const TOOLS = [
  { name: 'Lovable', img: '/ai-tools/lovable.jpg' },
  { name: 'Canva AI', img: '/ai-tools/canva.png' },
  { name: 'ChatGPT', img: '/ai-tools/openai.png' },
  { name: 'Gemini', img: '/ai-tools/gemini.png' },
  { name: 'Google Flow', img: '/ai-tools/google-flow.jpg' },
  { name: 'Pomelli', img: '/ai-tools/pomelli.jpg' },
  { name: 'Veo 3', img: '/ai-tools/veo3.png' },
  { name: 'Claude', img: '/ai-tools/claude.png' },
]

export default function AITools() {
  return (
    <section id="ai" className="ai-chess-section reveal">
      <div className="chess-bento">
        <div className="chess-hero">
          <div className="chess-hero-eyebrow">12 — AI Tools &middot; FFP Curriculum</div>
          <div className="chess-hero-title">AI Tools Used</div>
          <div className="chess-hero-sub">
            Every move calculated. Students played {TOOLS.length} AI tools to build brands, create
            content, launch websites, and grow their real business.
          </div>
          <div className="chess-hero-pill">&#9823; {TOOLS.length} tools in play</div>
        </div>
        <div className="chess-frame">
          <div className="chess-board">
            {TOOLS.map((t, i) => {
              const row = Math.floor(i / 4)
              const col = i % 4
              const light = (row + col) % 2 === 0
              return (
                <div key={t.name} className={`chess-sq ${light ? 'light' : 'dark'}`}>
                  <div className="chess-piece">
                    <img src={t.img} alt={t.name} />
                  </div>
                  <div className="chess-name">{t.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
