import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createStaticClient()
  const { data } = await supabase.from('students').select('slug')
  return data?.map(s => ({ slug: s.slug })) ?? []
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createStaticClient()
  const { data: student } = await supabase
    .from('students')
    .select('name, brand:brands(name)')
    .eq('slug', slug)
    .single()
  return { title: `${student?.name} — FFP 2026 Portfolio · Mesa` }
}

function formatRevenue(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('*, brand:brands(*)')
    .eq('slug', slug)
    .single()

  if (!student) notFound()

  const brand = student.brand as any
  const awards: string[] = Array.isArray(brand?.awards) ? brand.awards : []
  const videos: string[] = Array.isArray(brand?.videos) ? brand.videos.slice(0, 3) : []
  const adStatics: string[] = Array.isArray(brand?.ad_statics) ? brand.ad_statics.slice(0, 2) : []
  const fleaPhotos: string[] = Array.isArray(brand?.flea_photos) ? brand.flea_photos : []

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-left">
          <div className="nav-mark">
            <svg viewBox="0 0 16 16" fill="white"><rect x="2" y="9" width="12" height="1.5" rx="0.75" /><rect x="2" y="6" width="12" height="1.5" rx="0.75" /><rect x="5" y="3" width="6" height="4" rx="1" fill="none" stroke="white" strokeWidth="1.2" /></svg>
          </div>
          <Link href="/" className="nav-wordmark">Mesa <span>FFP</span> &middot; 2026</Link>
        </div>
        <div className="nav-center">
          <a href="#product">Venture</a>
          <a href="#proof">Proof</a>
          <a href="#assets">Assets</a>
          <a href="#ai">AI Tools</a>
          {awards.length > 0 && <a href="#awards">Awards</a>}
          <a href="#cert">Certificate</a>
        </div>
        <button className="nav-share" onClick={undefined}>
          <svg viewBox="0 0 16 16"><path d="M4 8V4h4M8 4l4 4M10 10v4H2V6" /></svg>
          Share portfolio
        </button>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ borderTop: 'none', padding: 0 }}>
        <div className="hero-left">
          <div className="cohort-pill">
            <div className="cohort-dot"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <span className="cohort-text">Future Founder Program &middot; Cohort 1 &middot; 2026</span>
          </div>
          <h1 className="hero-name">
            {student.name.split(' ')[0]} <em>{student.name.split(' ').slice(1).join(' ')}</em>
          </h1>
          <p className="hero-role">FFP Graduate &middot; Mesa School of Business &middot; Bangalore</p>
          <div className="hero-product">
            <strong>{brand?.name}</strong>
            <p>{brand?.description}</p>
          </div>
          <div className="metrics-strip">
            <div className="mc"><div className="mc-val red">{formatRevenue(brand?.revenue || 0)}</div><div className="mc-lbl">Revenue</div></div>
            <div className="mc"><div className="mc-val">{brand?.customers || 0}</div><div className="mc-lbl">Customers</div></div>
            <div className="mc"><div className="mc-val">2</div><div className="mc-lbl">Markets</div></div>
            <div className="mc"><div className="mc-val">1</div><div className="mc-lbl">Demo Day</div></div>
          </div>
          <div className="hero-ctas">
            {brand?.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer" className="btn-r">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5.5" /><path d="M4 6.5h5M7 4.5l2 2-2 2" /></svg>
                {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
            {brand?.instagram && (
              <a href={`https://instagram.com/${brand.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="btn-o">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="9" height="9" rx="2.5" /><circle cx="6.5" cy="6.5" r="2" /><circle cx="9.5" cy="3.5" r="0.6" fill="currentColor" /></svg>
                {brand.instagram.startsWith('@') ? brand.instagram : `@${brand.instagram}`}
              </a>
            )}
            {student.email && (
              <a href={`mailto:${student.email}`} className="btn-g">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10l3-3 2.5 2.5 3-4L13 8" /></svg>
                Email
              </a>
            )}
          </div>
        </div>
        <div className="hero-right">
          <div className="blob1"></div>
          <div className="blob2"></div>
          <div className="avatar">{getInitials(student.name)}</div>
          <p className="avatar-name">{student.name}</p>
          <p className="avatar-sub">Mesa &middot; FFP Cohort 1 &middot; 2026</p>
          <div className="cert-pill">
            <div className="cert-pill-row">
              <div className="cert-icon"><svg viewBox="0 0 18 18"><path d="M9 2l2 5h5l-4 3 1.5 5L9 12l-4.5 3L6 10 2 7h5z" /></svg></div>
              <div>
                <div className="cert-label">Certificate of Entrepreneurship</div>
                <div className="cert-name">Issued by Mesa School of Business</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT */}
      <section id="product" className="on-cream reveal" style={{ padding: '72px 56px', borderTop: '0.5px solid rgba(15,25,25,0.06)' }}>
        <div className="sec-tag">04 — Product worked on</div>
        <h2 className="sec-h">What they <em>built</em></h2>
        <p className="sec-sub">The actual product — designed, made, and sold within the 2-week FFP program.</p>
        <div className="product-grid">
          <div className="product-photo reveal d1">
            <svg viewBox="0 0 44 44"><rect x="4" y="8" width="36" height="28" rx="4" /><path d="M4 16h36" /><circle cx="16" cy="26" r="4" /><path d="M16 22v8M16 26h12" /></svg>
            <span>Product photo</span>
          </div>
          <div className="product-info">
            <div className="reveal d1">
              <div className="p-name">{brand?.name}</div>
              <p className="p-desc">{brand?.description}</p>
            </div>
            {brand?.website && (
              <div className="info-chip reveal d2">
                <svg viewBox="0 0 15 15"><circle cx="7.5" cy="7.5" r="6" /><path d="M4 7.5h7M9 5l2.5 2.5L9 10" /></svg>
                <div><div className="ic-label">Website</div><div className="ic-val"><a href={brand.website} target="_blank" rel="noopener noreferrer">{brand.website.replace(/^https?:\/\//, '')} &#8599;</a></div></div>
              </div>
            )}
            {brand?.instagram && (
              <div className="info-chip reveal d3">
                <svg viewBox="0 0 15 15"><rect x="2" y="2" width="11" height="11" rx="3" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="11" cy="4" r="0.8" fill="#BA3B41" /></svg>
                <div><div className="ic-label">Instagram</div><div className="ic-val"><a href={`https://instagram.com/${brand.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">{brand.instagram.startsWith('@') ? brand.instagram : `@${brand.instagram}`} &#8599;</a></div></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section id="proof" className="on-white reveal" style={{ padding: '72px 56px', borderTop: '0.5px solid rgba(15,25,25,0.06)' }}>
        <div className="sec-tag">06 &middot; 07 &middot; 14 &middot; 15 — Proof of work</div>
        <h2 className="sec-h">The <em>numbers</em> + the moments</h2>
        <p className="sec-sub">Real outcomes from 2 weeks of execution. Revenue generated, customers served, events attended.</p>
        <div className="proof-cards">
          <div className="pc acc reveal d1"><div className="pc-val">{formatRevenue(brand?.revenue || 0)}</div><div className="pc-lbl">Revenue generated</div></div>
          <div className="pc lite reveal d2"><div className="pc-val">{brand?.customers || 0}</div><div className="pc-lbl">Customers reached</div></div>
          <div className="pc lite reveal d3"><div className="pc-val">2</div><div className="pc-lbl">Markets attended</div></div>
          <div className="pc lite reveal d4"><div className="pc-val">1</div><div className="pc-lbl">Demo day</div></div>
        </div>
        <div className="event-grid">
          <div className="event-card reveal d1">
            <div className="carousel-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {fleaPhotos.length > 0 ? (
                <img src={fleaPhotos[0]} alt="Flea market" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="c-slide active">
                  <svg viewBox="0 0 32 32"><path d="M4 22l6-6 4 4 5-7 5 5" /><rect x="2" y="4" width="28" height="22" rx="3" fill="none" strokeWidth="1.5" /></svg>
                  <span>Flea market</span>
                </div>
              )}
            </div>
            <div className="event-cap"><div className="event-cap-title">Flea Market</div><div className="event-cap-sub">Vega City Mall &middot; FFP Week 1</div></div>
          </div>
          <div className="event-card reveal d2">
            <div className="carousel-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="c-slide active">
                <svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="18" rx="2" fill="none" strokeWidth="1.5" /><path d="M12 28h8M16 22v6" /></svg>
                <span>Demo day</span>
              </div>
            </div>
            <div className="event-cap"><div className="event-cap-title">Demo Day</div><div className="event-cap-sub">Mesa School of Business &middot; FFP Week 2</div></div>
          </div>
        </div>
      </section>

      {/* ASSETS */}
      <section id="assets" className="on-cream reveal" style={{ padding: '72px 56px', borderTop: '0.5px solid rgba(15,25,25,0.06)' }}>
        <div className="sec-tag">10 — Creative assets</div>
        <h2 className="sec-h">What they <em>made</em></h2>
        <p className="sec-sub">Every creative produced during FFP.</p>
        {videos.length > 0 && (
          <div className="asset-cat reveal d1">
            <div className="asset-cat-header">
              <svg viewBox="0 0 13 13"><polygon points="2,2 11,6.5 2,11" /></svg>
              Videos
            </div>
            <div className="assets-row">
              {videos.map((vid, i) => (
                <div key={i} className="a-thumb vid" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${vid}`}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ))}
              {videos.length < 3 && (
                <div className="a-thumb empty">
                  <svg viewBox="0 0 22 22"><path d="M11 4v14M4 11h14" /></svg>
                  <span>More videos</span>
                </div>
              )}
            </div>
          </div>
        )}
        {adStatics.length > 0 && (
          <div className="asset-cat reveal d2" style={{ marginBottom: 0 }}>
            <div className="asset-cat-header">
              <svg viewBox="0 0 13 13"><rect x="1" y="1" width="11" height="11" rx="2" /><circle cx="4" cy="4" r="1.5" /><path d="M1 9l3-3 3 2 2-3 4 4" /></svg>
              Performance marketing images
            </div>
            <div className="assets-row">
              {adStatics.map((img, i) => (
                <div key={i} className="a-thumb img" style={{ overflow: 'hidden' }}>
                  <img src={img} alt={`Ad static ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {videos.length === 0 && adStatics.length === 0 && (
          <p style={{ fontSize: '13px', color: 'rgba(15,25,25,0.4)' }}>No creative assets uploaded yet.</p>
        )}
      </section>

      {/* AI TOOLS ROULETTE */}
      <section id="ai" className="on-dark reveal" style={{ padding: '72px 0', overflow: 'hidden', borderTop: '0.5px solid rgba(15,25,25,0.06)' }}>
        <div style={{ padding: '0 56px' }}>
          <div className="sec-tag inv">12 — AI Tools &middot; FFP Curriculum</div>
          <h2 className="sec-h inv">Trained on <em>AI</em></h2>
          <p className="sec-sub inv" style={{ marginBottom: '32px' }}>The same toolkit taught to every FFP 2026 student. Hover to pause. Proficiency assessed by faculty.</p>
        </div>
        <div className="roulette-wrap">
          <div className="roulette-fade-l"></div>
          <div className="roulette-fade-r"></div>
          <div className="roulette-track" id="roulette"></div>
        </div>
      </section>

      {/* AWARDS (only if student has awards) */}
      {awards.length > 0 && (
        <section id="awards" className="awards-section on-dark" style={{ position: 'relative', overflow: 'hidden', padding: '72px 56px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div className="awards-bg-text">Won</div>
          <div className="awards-wrap">
            <div className="sec-tag inv">13 — Awards &middot; earned during FFP</div>
            <h2 className="sec-h inv" style={{ marginBottom: '6px' }}>They <em>won</em></h2>
            <p className="sec-sub inv">Awards earned by {student.name} during FFP 2026.</p>
            <div className="awards-grid">
              {awards.map((award, i) => (
                <div key={i} className={`award-card ${i === 0 ? 'winner' : ''} reveal d${i + 1}`}>
                  <div className="award-lemon-stripe" style={i > 0 ? { background: '#BA3B41' } : undefined}></div>
                  {i === 0 && (
                    <div className="award-stamp"><svg viewBox="0 0 24 24"><path d="M12 2l2.5 7H22l-6 4.5 2.3 7L12 17l-6.3 3.5 2.3-7L2 9h7.5z" /></svg></div>
                  )}
                  <div className="award-icon" style={i > 0 ? { background: 'rgba(186,59,65,0.15)' } : undefined}>
                    <svg viewBox="0 0 22 22" style={i > 0 ? { stroke: '#DFA396' } : undefined}><path d="M7 3h8v7a4 4 0 01-8 0V3zM4 3h3v5a3 3 0 01-3-3V3zM15 3h3v2a3 3 0 01-3 3V3zM11 14v5M8 19h6" /></svg>
                  </div>
                  <div className="award-badge-label" style={i > 0 ? { background: 'rgba(186,59,65,0.15)', borderColor: 'rgba(186,59,65,0.3)', color: '#DFA396' } : undefined}>
                    {i === 0 ? 'Winner' : 'Award'}
                  </div>
                  <div className="award-title">{award}</div>
                  <div className="award-sub">FFP Cohort 1 &middot; 2026 &middot; Mesa School of Business &middot; Bangalore</div>
                  <div className="award-student">Awarded to {student.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CERTIFICATE */}
      <section id="cert" className="on-cream reveal" style={{ padding: '72px 56px', borderTop: '0.5px solid rgba(15,25,25,0.06)' }}>
        <div className="sec-tag">11 — Certificate of Entrepreneurship</div>
        <h2 className="sec-h">Officially <em>certified</em></h2>
        <p className="sec-sub">Signed by both co-founders of Mesa School of Business. A permanent verified record.</p>
        <div className="cert-layout">
          <div className="cert-doc reveal d1">
            {student.certificate_url && (
              <img src={student.certificate_url} alt="Certificate" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />
            )}
            <div className="cert-doc-header">
              <div className="cert-doc-icon"><svg viewBox="0 0 20 20"><path d="M10 2l2.2 6.2H19l-5.4 3.9 2.1 6.2L10 14.5l-5.7 3.8 2.1-6.2L1 8.2h6.8z" /></svg></div>
              <div>
                <div className="cert-doc-school">Mesa School of Business</div>
                <div className="cert-doc-title">Certificate of Entrepreneurship</div>
              </div>
            </div>
            <div className="cert-divider"></div>
            <div className="cert-issued-to">This certifies that</div>
            <div className="cert-student-name">{student.name}</div>
            <div className="cert-program">successfully completed the Future Founder Program &middot; Cohort 1 &middot; 2026<br />and built a real, revenue-generating business within the 2-week program.</div>
            <div className="cert-sigs">
              <div><div className="sig-line"></div><div className="sig-name">Co-founder A</div><div className="sig-role">Mesa School of Business</div></div>
              <div><div className="sig-line"></div><div className="sig-name">Co-founder B</div><div className="sig-role">Mesa School of Business</div></div>
            </div>
          </div>
          <div className="cert-notes reveal d2">
            <div className="cert-note"><strong>Signed by both co-founders.</strong> Issued only on program completion and verified by Mesa staff. Cannot be self-generated by students.</div>
            {awards.length > 0 && (
              <div className="cert-note"><strong>Awards earned.</strong> {student.name} won: {awards.join(', ')}</div>
            )}
            <div className="cert-note" style={{ background: '#0F1919', color: 'rgba(255,251,243,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <strong style={{ color: '#FFFBF3' }}>This portfolio is the verification.</strong> Hosted at ffp.mesaschool.co — the URL itself is the proof of authenticity.
            </div>
            {student.certificate_url && (
              <a href={student.certificate_url} download className="btn-r" style={{ display: 'inline-flex', marginTop: '8px' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 2v8M3 7.5l3.5 3.5L10 7.5M2 11h9" /></svg>
                Download Certificate
              </a>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <div className="contact-bar reveal">
        <div>
          <div className="contact-title">Get in <em>touch</em></div>
          <div className="contact-email">
            {student.email && <>{student.email} &nbsp;&middot;&nbsp; </>}
            {brand?.instagram && <a href={`https://instagram.com/${brand.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">{brand.instagram.startsWith('@') ? brand.instagram : `@${brand.instagram}`}</a>}
          </div>
        </div>
        <div className="contact-btns">
          {brand?.instagram && (
            <a href={`https://instagram.com/${brand.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="cbtn-w">Instagram &#8599;</a>
          )}
          {student.email && (
            <a href={`mailto:${student.email}`} className="cbtn-o">Email</a>
          )}
          {brand?.website && (
            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="cbtn-o">Website &#8599;</a>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-l">Portfolio by <Link href="https://mesaschool.co">Mesa School of Business</Link> &middot; FFP 2026 &middot; Not student-editable</div>
        <div className="footer-r">ffp.mesaschool.co/{slug}</div>
      </footer>

      <PortfolioScripts />
    </>
  )
}

function PortfolioScripts() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
// Scroll reveal
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold: 0.12});
document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

// AI Tools roulette
var tools = [
  {name:'ChatGPT',use:'Business planning, product descriptions, customer research',logo:'\\u{1F4AC}',proficiency:3},
  {name:'Canva AI',use:'Brand assets, ad creatives, social content generation',logo:'\\u{1F3A8}',proficiency:4},
  {name:'Meta Ads AI',use:'Performance marketing, audience targeting, ad copy',logo:'\\u{1F4CA}',proficiency:2},
  {name:'Google Gemini',use:'Market research, competitor analysis, pricing strategy',logo:'\\u2726',proficiency:3},
  {name:'ElevenLabs',use:'AI voiceovers for product videos and reels',logo:'\\u{1F399}',proficiency:2},
  {name:'Runway ML',use:'AI video editing for influencer collab content',logo:'\\u{1F3AC}',proficiency:3}
];
var levels = ['','Foundational','Proficient','Advanced','Advanced+','Expert'];
function buildCard(t) {
  var pips = '';
  for (var i = 0; i < 5; i++) pips += '<div class="pip' + (i < t.proficiency ? ' on' : '') + '"></div>';
  return '<div class="tool-card"><div class="tool-logo">' + t.logo + '</div><div class="tool-name">' + t.name + '</div><div class="tool-use">' + t.use + '</div><div class="tool-level"><div class="pips">' + pips + '</div><span class="level-txt">' + levels[t.proficiency] + '</span></div></div>';
}
var rouletteTrack = document.getElementById('roulette');
if (rouletteTrack) {
  var html = '';
  for (var j = 0; j < tools.length; j++) html += buildCard(tools[j]);
  rouletteTrack.innerHTML = html + html;
}
        `,
      }}
    />
  )
}
