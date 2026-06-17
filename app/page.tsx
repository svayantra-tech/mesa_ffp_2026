import { getBrandsBySlugs, getAwardBrands, getAllStudentsBasic, getProgramMedia, type BrandShape } from '@/lib/data'

type StudentBasic = { name: string; brand_id: string | null }
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import DemoDay from '@/app/components/DemoDay'

function formatRevenue(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export default async function HomePage() {
  const [topVentures, awardBrands, allStudents, programMedia] = await Promise.all([
    getBrandsBySlugs(['azuri', 'kintoken', 'tact', 'lysso']),
    getAwardBrands(),
    getAllStudentsBasic(),
    getProgramMedia(),
  ])

  const media: Record<string, string> = Object.fromEntries(
    programMedia.map(({ key, value }) => [key, value])
  )

  const fleaPhotos = [
    media.flea_photo_1,
    media.flea_photo_2,
    media.flea_photo_3,
    media.flea_photo_4,
    media.flea_photo_5,
    media.flea_photo_6,
  ].filter(Boolean)

  const ventureOrder = ['azuri', 'kintoken', 'tact', 'lysso']
  const sortedVentures = ventureOrder
    .map(slug => topVentures?.find(v => v.slug === slug))
    .filter(Boolean) as NonNullable<typeof topVentures>

  const ventureAwardLabels: Record<string, string> = {
    azuri: 'Highest Revenue',
    kintoken: '2nd Highest Revenue',
    tact: 'Best Pitch',
    lysso: 'Spirit Award',
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-left">
          <Link href="/">
            <Image src="/assets/mesa-logo.png" alt="Mesa School of Business" width={75} height={28} quality={100} className="nav-logo" priority />
          </Link>
        </div>
        <div className="nav-center">
          <a href="#what-they-built">The Program</a>
          <a href="#demo-day">Demo Day</a>
          <a href="#enquire">FFP 2027</a>
          <a href="#ventures">Ventures</a>
        </div>
        <Link href="/directory" className="nav-cta">
          <svg viewBox="0 0 16 16"><path d="M6 2h8M6 6h8M6 10h8M6 14h8M2 2h0M2 6h0M2 10h0M2 14h0" strokeLinecap="round" /></svg>
          Browse Students
        </Link>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-tag fade-up">
          <span className="hero-tag-line"></span>
          Future Founder&apos;s Summer School &middot; Cohort 1
        </div>
        <h1 className="hero-headline fade-up d1">
          BUILT <span className="light">Real Ventures.</span><br />
          EARNED <span className="light">Real Revenue.</span>
        </h1>
        <p className="hero-sub fade-up d2">
          113 students. 29 ventures. 2 weeks. Every product designed, built, and
          sold to real customers — from perfumes to protein bars to bamboo socks.
          This is what entrepreneurship looks like at 15.
        </p>
        <div className="stats-strip fade-up d3">
          <div className="stat"><div className="stat-val red">113</div><div className="stat-lbl">Students</div></div>
          <div className="stat"><div className="stat-val">29</div><div className="stat-lbl">Ventures</div></div>
          <div className="stat"><div className="stat-val red">₹16L+</div><div className="stat-lbl">Total Revenue</div></div>
          <div className="stat"><div className="stat-val">2 Weeks</div><div className="stat-lbl">Program Duration</div></div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* 01 — FLEA MARKET */}
      <section id="what-they-built" className="numbered-section on-cream">
        <Image src="/assets/brand-element-solid.png" alt="" width={280} height={361} quality={100} className="section-brand-el" style={{ right: '-120px', bottom: '-100px', opacity: 0.05 }} />
        <div className="section-num reveal">01</div>
        <div className="section-num-small reveal">What they built</div>
        <h2 className="section-title reveal">FLEA MARKET <span className="light">at Vega City Mall</span></h2>
        <p className="section-sub reveal">
          Students sold directly to real customers inside Vega City Mall, Bannerghatta Road, Bangalore.
          Every rupee earned was real. Every customer was a stranger. No safety nets.
        </p>

        <div className="marquee-wrap reveal d1">
          <div className="marquee-track">
            {['Flea Market', 'Stall Setup', 'Customers', 'Products', 'Packaging', 'Vega City', 'Team Work', 'Selling',
              'Flea Market', 'Stall Setup', 'Customers', 'Products', 'Packaging', 'Vega City', 'Team Work', 'Selling'].map((label, i) => (
              <div key={i} className="marquee-slot">
                {fleaPhotos[i % fleaPhotos.length] ? (
                  <Image src={fleaPhotos[i % fleaPhotos.length]} alt={label} fill quality={100} sizes="(max-width: 768px) 320px, 420px" style={{ objectFit: 'cover' }} />
                ) : (
                  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="highlight-strip">
          <div className="highlight-item reveal d3">
            <div className="highlight-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
            </div>
            <div><div className="highlight-label">Venue</div><div className="highlight-val">Vega City Mall, Bannerghatta</div></div>
          </div>
          <div className="highlight-item reveal d3">
            <div className="highlight-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            </div>
            <div><div className="highlight-label">Duration</div><div className="highlight-val">2-Day Mega Flea Market</div></div>
          </div>
          <div className="highlight-item reveal d4">
            <div className="highlight-icon">
              <svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1110.34 18" /><path d="M7 6h2v4" /></svg>
            </div>
            <div><div className="highlight-label">Highest Revenue</div><div className="highlight-val">₹3,04,550 — Azuri</div></div>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* 02 — DEMO DAY */}
      <DemoDay
        demoVideoId={media.demo_day_video_id}
        demoPhotos={[
          media.demo_photo_1,
          media.demo_photo_2,
          media.demo_photo_3,
          media.demo_photo_4,
        ].filter(Boolean)}
      />

      <hr className="section-divider" />

      {/* VENTURES */}
      <section id="ventures" className="ventures-section">
        <div className="ventures-header">
          <div>
            <div className="section-num-small">Featured ventures</div>
            <h2 className="section-title">TOP <span className="light">Performers</span></h2>
          </div>
          <Link href="/directory" style={{ fontSize: '12px', fontWeight: 700, color: '#BA3B41', textDecoration: 'none', letterSpacing: '.03em', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "var(--font-manrope),sans-serif" }}>
            View all 29 ventures
            <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="#BA3B41" strokeWidth="2"><path d="M4 2l4 4-4 4" /></svg>
          </Link>
        </div>
        <div className="ventures-grid">
          {sortedVentures?.map((venture, i) => {
            const students = allStudents?.filter(s => s.brand_id === venture.id) || []
            const founderNames = [...new Set(students.map(s => s.name))].join(', ')
            const awards = Array.isArray(venture.awards) ? venture.awards : []
            const awardLabel = ventureAwardLabels[venture.slug] || (awards.length > 0 ? String(awards[0]) : '')
            return (
              <div key={venture.slug} className={`venture-card reveal d${i + 1}`}>
                <div className="venture-card-photo">
                  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                </div>
                <div className="venture-card-header">
                  <span className="venture-card-name">{venture.name}</span>
                  {awardLabel && <span className="venture-card-award">{awardLabel}</span>}
                </div>
                <div className="venture-card-body">
                  <div className="venture-card-product">{venture.description}</div>
                  <div className="venture-card-stats">
                    <div className="venture-card-stat">
                      <div className="venture-card-stat-val red">{formatRevenue(venture.revenue)}</div>
                      <div className="venture-card-stat-lbl">Revenue</div>
                    </div>
                    <div className="venture-card-stat">
                      <div className="venture-card-stat-val">{venture.customers}</div>
                      <div className="venture-card-stat-lbl">Customers</div>
                    </div>
                  </div>
                  {founderNames && (
                    <div className="venture-card-team">
                      <div className="venture-card-team-label">Founders</div>
                      <div className="venture-card-team-names">{founderNames}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* AWARDS CAROUSEL */}
      <section className="awards-landing">
        <div className="awards-bg-text">Awards</div>
        <Image src="/assets/brand-element-concentric.png" alt="" width={340} height={443} quality={100} className="section-brand-el" style={{ right: '-140px', top: '-80px', opacity: 0.04 }} />
        <div className="awards-landing-tag reveal">Recognition &middot; Earned During FFP</div>
        <h2 className="awards-landing-title reveal d1">RECOGNITION <span className="light">&amp; Awards</span></h2>
        <p className="awards-landing-sub reveal d2">17 ventures earned awards across Demo Day, Flea Market performance, and special categories.</p>

        <AwardsCarousel awardBrands={awardBrands} allStudents={allStudents} />
      </section>

      {/* 03 — ENQUIRE */}
      <section id="enquire" className="numbered-section on-butter">
        <Image src="/assets/brand-element-concentric.png" alt="" width={280} height={365} quality={100} className="section-brand-el" style={{ right: '-140px', top: '50%', transform: 'translateY(-50%)', opacity: 0.06 }} />
        <div className="section-num reveal">03</div>
        <div className="section-num-small reveal">Know more</div>
        <h2 className="section-title reveal">INTERESTED <span className="light">in FFP 2027?</span></h2>
        <p className="section-sub reveal">
          The Future Founder&apos;s Summer School returns next year. If you&apos;re a student,
          parent, or educator — find out how to apply for the next cohort.
        </p>
        <div className="enquire-content">
          <div className="enquire-text reveal d1">
            FFP is a 2-week intensive entrepreneurship programme by Mesa School of Business,
            Bangalore. Students form teams, build real products, sell to real customers,
            and pitch to real investors — all before they turn 18.<br /><br />
            Applications for Cohort 2 (Summer 2027) will open soon.
            Visit the Mesa website for programme details, eligibility, and application timelines.
          </div>
          <a href="https://mesaschool.co/future-founders-summer-school/" target="_blank" rel="noopener noreferrer" className="enquire-cta reveal d2">
            Learn More About FFP
            <svg viewBox="0 0 16 16"><path d="M4 12l8-8M6 4h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </section>

      <hr className="section-divider" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* DIRECTORY CTA */}
      <section className="directory-cta">
        <Image src="/assets/brand-element-concentric.png" alt="" width={340} height={443} quality={100} className="brand-el" />
        <div className="directory-cta-tag reveal">Student Directory</div>
        <h2 className="directory-cta-title reveal d1">Browse 100+ student portfolios</h2>
        <p className="directory-cta-sub reveal d2">
          Every student has a portfolio. Search by name, venture, or product to find
          their work, awards, and certificates.
        </p>
        <Link href="/directory" className="directory-cta-btn reveal d3">
          Open Directory
          <svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-l">
          <div className="footer-mark">
            <svg viewBox="0 0 20 20" fill="none">
              <rect x="3" y="11" width="14" height="2" rx="1" fill="white" />
              <rect x="3" y="7.5" width="14" height="2" rx="1" fill="white" />
              <rect x="6" y="3" width="8" height="5" rx="1.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          Built by <a href="https://mesaschool.co">Mesa School of Business</a> &nbsp;&middot;&nbsp; Future Founder&apos;s Summer School 2026
        </div>
        <div className="footer-r">ffp.mesaschool.co</div>
      </footer>

      <LandingScripts />
    </>
  )
}

function AwardsCarousel({ awardBrands, allStudents }: { awardBrands: BrandShape[] | null; allStudents: StudentBasic[] | null }) {
  const brands = awardBrands || []
  return (
    <div className="awards-carousel reveal d3" id="awardsCarousel">
      <div className="awards-viewport">
        <div className="awards-track" id="awardsTrack">
          {brands.map((brand) => {
            const students = allStudents?.filter(s => s.brand_id === brand.id) || []
            const founderNames = [...new Set(students.map((s) => s.name))].join(', ')
            const awards = Array.isArray(brand.awards) ? brand.awards : []
            return (
              <div key={brand.slug} className="award-card-l">
                <div className="award-lemon-stripe"></div>
                <div className="award-card-photo">
                  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                </div>
                <div className="award-card-body">
                  <div className="award-venture-name">{brand.name}</div>
                  <div className="award-founders">{founderNames}</div>
                  <div className="award-names">
                    {awards.map((award: string, i: number) => (
                      <span key={i} className="award-badge">{award}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="awards-controls">
        <button className="awards-arrow" id="awardsPrev">
          <svg viewBox="0 0 16 16"><path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="awards-dots" id="awardsDots"></div>
        <button className="awards-arrow" id="awardsNext">
          <svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  )
}

function LandingScripts() {
  return (
    <Script id="landing-scripts" strategy="afterInteractive">{`
var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold: 0.12});
document.querySelectorAll('.reveal').forEach(function(el) { revealObserver.observe(el); });

(function() {
  var track = document.getElementById('awardsTrack');
  if (!track) return;
  var dotsWrap = document.getElementById('awardsDots');
  var cards = track.querySelectorAll('.award-card-l');
  var total = cards.length;
  if (total === 0) return;
  var isMobile = function() { return window.innerWidth <= 900; };
  var perView = function() { return isMobile() ? 1 : 2; };
  var currentIdx = 0;
  var autoTimer = null;
  var carousel = document.getElementById('awardsCarousel');

  function maxIdx() { return Math.max(0, total - perView()); }

  function buildDots() {
    dotsWrap.innerHTML = '';
    var steps = maxIdx() + 1;
    for (var i = 0; i < steps; i++) {
      var d = document.createElement('span');
      d.className = 'awards-dot' + (i === currentIdx ? ' active' : '');
      d.dataset.idx = i;
      d.addEventListener('click', function() { goTo(parseInt(this.dataset.idx)); });
      dotsWrap.appendChild(d);
    }
  }

  function goTo(idx) {
    currentIdx = Math.max(0, Math.min(idx, maxIdx()));
    var gap = 16;
    var cardW = cards[0].offsetWidth + gap;
    track.style.transform = 'translateX(-' + (currentIdx * cardW) + 'px)';
    var dots = dotsWrap.querySelectorAll('.awards-dot');
    dots.forEach(function(d) { d.classList.remove('active'); });
    if (dots[currentIdx]) dots[currentIdx].classList.add('active');
  }

  function next() { goTo(currentIdx >= maxIdx() ? 0 : currentIdx + 1); }
  function prev() { goTo(currentIdx <= 0 ? maxIdx() : currentIdx - 1); }

  function startAuto() { stopAuto(); autoTimer = setInterval(next, 2000); }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

  document.getElementById('awardsNext').addEventListener('click', function() { next(); startAuto(); });
  document.getElementById('awardsPrev').addEventListener('click', function() { prev(); startAuto(); });
  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);

  buildDots();
  startAuto();
  window.addEventListener('resize', function() { buildDots(); goTo(Math.min(currentIdx, maxIdx())); });
})();

    `}</Script>
  )
}
