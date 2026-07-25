import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import DemoDay from '@/app/components/DemoDay'
import ImageCarousel from '@/app/components/ImageCarousel'
import HeroImage from '@/app/components/HeroImage'
import FeatCardImage from '@/app/components/FeatCardImage'
import YoutubeEmbed from '@/app/components/YoutubeEmbed'
import CohortSwitcher from '@/app/components/CohortSwitcher'
import NavMobileMenu from '@/app/components/NavMobileMenu'
import { isValidCohort, getCohort } from '@/lib/cohorts'
import { getEnabledCohorts } from '@/lib/cohort-visibility'
import { SITE_HOST } from '@/lib/site'
import {
  getBrandsBySlugs,
  getFeaturedBrands,
  getAwardBrands,
  getAllStudentsBasic,
  getProgramMedia,
  getCohortStats,
  getTopBrandByRevenue,
  type BrandShape,
} from '@/lib/db/queries'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cohort } = await params
  if (!isValidCohort(cohort)) return {}
  const c = getCohort(cohort)
  const stats = await getCohortStats(cohort)
  const description = `${stats.students} students. ${stats.ventures} ventures. ${(c?.durationLabel ?? '').toLowerCase()}. Real revenue.`
  const title = `Future Founder Program · ${c?.name ?? cohort} · ${c?.year ?? ''} · Mesa`
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { description },
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Params = { cohort: string }
type StudentBasic = { name: string; brand_id: string | null }

function parseJsonUrls(s?: string): string[] {
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'))
  } catch {
    return []
  }
}

function formatRevenue(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export default async function HomePage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()
  const cohortMeta = getCohort(cohort)
  const cohortName = cohortMeta?.name ?? cohort
  const durationLabel = cohortMeta?.durationLabel ?? ''

  // Top Performers: use the cohort's curated list if it has one, else auto-derive
  // from this cohort's brands that have a feature_photo (revenue desc). Cohort-scoped
  // either way — no hardcoded cross-cohort slugs.
  const curatedTop = cohortMeta?.topPerformers ?? []
  const topVenturesFetch = curatedTop.length
    ? getBrandsBySlugs(cohort, curatedTop.map((t) => t.slug))
    : getFeaturedBrands(cohort, 4)

  const [topVentures, awardBrands, allStudents, programMedia, enabledCohorts, stats, topBrand] = await Promise.all([
    topVenturesFetch,
    getAwardBrands(cohort),
    getAllStudentsBasic(cohort),
    getProgramMedia(cohort),
    getEnabledCohorts(),
    getCohortStats(cohort),
    getTopBrandByRevenue(cohort),
  ])
  // "₹16L+" style — lakhs rounded to nearest, with a "+", off the real revenue sum
  // (matches the current prod display: cohort-1's ₹15.9L renders as ₹16L+).
  const revenueLabel = `₹${Math.round(stats.totalRevenue / 100000)}L+`

  const media: Record<string, string> = Object.fromEntries(
    programMedia.map(({ key, value }) => [key, value])
  )

  const fleaPhotos = (() => {
    const fromNew = parseJsonUrls(media.landing_flea_photos)
    if (fromNew.length > 0) return fromNew
    return ([
      media.flea_photo_1, media.flea_photo_2, media.flea_photo_3,
      media.flea_photo_4, media.flea_photo_5, media.flea_photo_6,
    ] as (string | undefined)[]).filter((s): s is string => !!s)
  })()

  const heroImage = parseJsonUrls(media.landing_hero_image)[0] ?? null
  const demoDayImages = parseJsonUrls(media.landing_demo_day)
  const highlightPhotos = parseJsonUrls(media.landing_highlights)
  const ffp2027VideoId = media.landing_ffp2027_video_id || null

  // Curated cohorts keep their exact order + award labels; auto cohorts show the
  // fetched featured brands (already revenue-sorted) as-is.
  const sortedVentures = (curatedTop.length
    ? curatedTop.map((t) => topVentures?.find((v) => v.slug === t.slug)).filter(Boolean)
    : (topVentures ?? [])) as NonNullable<typeof topVentures>

  const ventureAwardLabels: Record<string, string> = Object.fromEntries(
    curatedTop.map((t) => [t.slug, t.label])
  )

  // Year-derived labels (no hardcoded 2027/2026). The "next cohort" enquire link is
  // this cohort's year + 1.
  const cohortYear = cohortMeta?.year ?? 2026
  const nextCohortLabel = `FFP ${cohortYear + 1}`

  // Contiguous eyebrow numbers over the sections that actually render, so cohort-2
  // (with flea/demo-day hidden) doesn't show an orphaned "03".
  const pad = (n: number) => String(n).padStart(2, '0')
  let secNum = 0
  const fleaSecNum = fleaPhotos.length > 0 ? pad(++secNum) : ''
  const demoSecNum = demoDayImages.length > 0 ? pad(++secNum) : ''
  const knowMoreSecNum = pad(++secNum)

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-left">
          <Link href={`/${cohort}`}>
            <Image src="/assets/mesa-logo.png" alt="Mesa School of Business" width={75} height={28} quality={100} className="nav-logo" priority />
          </Link>
        </div>
        <NavMobileMenu>
          <div className="nav-center">
            {fleaPhotos.length > 0 && <a href="#what-they-built">The Program</a>}
            {demoDayImages.length > 0 && <a href="#demo-day">Demo Day</a>}
            <a href="#enquire">{nextCohortLabel}</a>
            {sortedVentures.length > 0 && <a href="#ventures">Ventures</a>}
          </div>
          <CohortSwitcher cohorts={enabledCohorts} currentCohort={cohort} pageType="landing" />
          <Link href={`/${cohort}/directory`} className="nav-cta">
            <svg viewBox="0 0 16 16"><path d="M6 2h8M6 6h8M6 10h8M6 14h8M2 2h0M2 6h0M2 10h0M2 14h0" strokeLinecap="round" /></svg>
            Browse Students
          </Link>
        </NavMobileMenu>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        {heroImage && <HeroImage src={heroImage} />}
        <div className="hero-text">
          <div className="hero-tag fade-up">
            <span className="hero-tag-line"></span>
            Future Founder&apos;s Summer School &middot; {cohortName}
          </div>
          <h1 className="hero-headline fade-up d1">
            BUILT <span className="light">Real Ventures.</span><br />
            EARNED <span className="light">Real Revenue.</span>
          </h1>
          <p className="hero-sub fade-up d2">
            {stats.students} students. {stats.ventures} ventures. {durationLabel.toLowerCase()}. Every product designed, built, and
            sold to real customers — from perfumes to protein bars to bamboo socks.
            This is what entrepreneurship looks like at 15.
          </p>
          <div className="stats-strip fade-up d3">
            <div className="stat"><div className="stat-val red">{stats.students}</div><div className="stat-lbl">Students</div></div>
            <div className="stat"><div className="stat-val">{stats.ventures}</div><div className="stat-lbl">Ventures</div></div>
            <div className="stat"><div className="stat-val red">{revenueLabel}</div><div className="stat-lbl">Total Revenue</div></div>
            <div className="stat"><div className="stat-val">{durationLabel}</div><div className="stat-lbl">Program Duration</div></div>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* 01 — FLEA MARKET */}
      {fleaPhotos.length > 0 && (
        <section id="what-they-built" className="numbered-section on-cream">
          <Image src="/assets/brand-element-solid.png" alt="" width={280} height={361} quality={100} className="section-brand-el" style={{ right: '-120px', bottom: '-100px', opacity: 0.05 }} />
          <div className="section-num reveal">{fleaSecNum}</div>
          <div className="section-num-small reveal">What they built</div>
          <h2 className="section-title reveal">FLEA MARKET <span className="light">at Vega City Mall</span></h2>
          <p className="section-sub reveal">
            Students sold directly to real customers inside Vega City Mall, Bannerghatta Road, Bangalore.
            Every rupee earned was real. Every customer was a stranger. No safety nets.
          </p>

          {(() => {
            const track = [...fleaPhotos, ...fleaPhotos]
            const dur = `${Math.max(14, fleaPhotos.length * 4.5)}s`
            return (
              <div className="marquee-wrap reveal d1">
                <div className="marquee-track" style={{ animationDuration: dur }}>
                  {track.map((src, i) => (
                    <div key={i} className="marquee-slot">
                      <Image src={src} alt="Flea Market" fill quality={85} sizes="(max-width: 768px) 320px, 420px" style={{ objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

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
            {topBrand && (
              <div className="highlight-item reveal d4">
                <div className="highlight-icon">
                  <svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1110.34 18" /><path d="M7 6h2v4" /></svg>
                </div>
                <div><div className="highlight-label">Highest Revenue</div><div className="highlight-val">₹{topBrand.revenue.toLocaleString('en-IN')} — {topBrand.name}</div></div>
              </div>
            )}
          </div>
        </section>
      )}

      <hr className="section-divider" />

      {/* DEMO DAY (eyebrow number derived from rendered sections) */}
      <DemoDay
        demoDayImages={demoDayImages}
        sectionNum={demoSecNum}
        stats={cohortMeta?.demoDay ?? { ventures: stats.ventures, awards: stats.awardedVentures, pitchLabel: '5 min', vcJudges: 0 }}
        demoPhotos={[
          media.demo_photo_1,
          media.demo_photo_2,
          media.demo_photo_3,
          media.demo_photo_4,
        ].filter(Boolean)}
      />

      <hr className="section-divider" />

      {/* HIGHLIGHTS & MOMENTS */}
      {highlightPhotos.length > 0 && (
        <section className="highlights-section on-butter">
          <div className="highlights-header">
            <div className="section-num-small reveal">Life at FFP</div>
            <h2 className="section-title reveal">HIGHLIGHTS <span className="light">&amp; Moments</span></h2>
            <p className="section-sub reveal">Talent Night, Scribble Day, and everything in between.</p>
          </div>
          <div className="highlights-carousel reveal d2">
            <ImageCarousel images={highlightPhotos} aspect="16/9" />
          </div>
        </section>
      )}

      {/* Featured "Top Performers" are a curated per-cohort slug list; hide the
          whole section (and its divider) when none resolve for this cohort. */}
      {sortedVentures.length > 0 && (
      <>
      <hr className="section-divider" />

      {/* VENTURES */}
      <section id="ventures" className="ventures-section">
        <div className="ventures-header">
          <div>
            <div className="section-num-small">Featured ventures</div>
            <h2 className="section-title">TOP <span className="light">Performers</span></h2>
          </div>
          <Link href={`/${cohort}/directory`} style={{ fontSize: '12px', fontWeight: 700, color: '#BA3B41', textDecoration: 'none', letterSpacing: '.03em', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "var(--font-manrope),sans-serif" }}>
            View all {stats.ventures} ventures
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
              <div key={venture.slug} className={`feat-card reveal d${i + 1}`}>
                <div className="feat-card-photo">
                  {venture.feature_photo
                    ? <FeatCardImage src={venture.feature_photo} alt={venture.name} />
                    : null}
                </div>
                <div className="feat-card-body">
                  <div className="feat-card-name">{venture.name}</div>
                  {awardLabel && <span className="feat-card-award">{awardLabel}</span>}
                  <div className="feat-card-stats">
                    <div className="feat-card-stat">
                      <div className="feat-card-stat-val red">{formatRevenue(venture.revenue)}</div>
                      <div className="feat-card-stat-lbl">Revenue</div>
                    </div>
                    {venture.customers > 0 && (
                    <div className="feat-card-stat">
                      <div className="feat-card-stat-val">{venture.customers}</div>
                      <div className="feat-card-stat-lbl">Customers</div>
                    </div>
                    )}
                  </div>
                  {founderNames && <div className="feat-card-founders">{founderNames}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </section>
      </>
      )}

      {/* AWARDS CAROUSEL */}
      <section className="awards-landing">
        <div className="awards-bg-text">Awards</div>
        <Image src="/assets/brand-element-concentric.png" alt="" width={340} height={443} quality={100} className="section-brand-el" style={{ right: '-140px', top: '-80px', opacity: 0.04 }} />
        <div className="awards-landing-tag reveal">Recognition &middot; Earned During FFP</div>
        <h2 className="awards-landing-title reveal d1">RECOGNITION <span className="light">&amp; Awards</span></h2>
        <p className="awards-landing-sub reveal d2">{stats.awardedVentures} ventures earned awards across Demo Day, Flea Market performance, and special categories.</p>

        <AwardsCarousel awardBrands={awardBrands} allStudents={allStudents} />
      </section>

      {/* 03 — ENQUIRE */}
      <section id="enquire" className="numbered-section on-butter">
        <Image src="/assets/brand-element-concentric.png" alt="" width={280} height={365} quality={100} className="section-brand-el" style={{ right: '-140px', top: '50%', transform: 'translateY(-50%)', opacity: 0.06 }} />
        <div className="section-num reveal">{knowMoreSecNum}</div>
        <div className="section-num-small reveal">Know more</div>
        <h2 className="section-title reveal">INTERESTED <span className="light">in Mesa Future Founders?</span></h2>
        <p className="section-sub reveal">
          The Future Founder&apos;s Summer School returns next year. If you&apos;re a student,
          parent, or educator, find out how to apply for the next cohort.
        </p>
        <div className={`enquire-layout${ffp2027VideoId ? ' has-image' : ''}`}>
          <div className="enquire-content">
            <div className="enquire-text reveal d1">
              This programme is a 2-week intensive entrepreneurship experience by Mesa School of Business,
              Bangalore. Students form teams, build real products, sell to real customers,
              and pitch to real investors — all before they turn 18!<br /><br />
              Applications for the next cohort will open soon.
              Visit the Mesa website for programme details, eligibility, and application timelines.
            </div>
            <a href="https://mesaschool.co/future-founders-summer-school/" target="_blank" rel="noopener noreferrer" className="enquire-cta reveal d2">
              Learn More About FFP
              <svg viewBox="0 0 16 16"><path d="M4 12l8-8M6 4h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
          {ffp2027VideoId && (
            <div className="enquire-carousel reveal d3">
              <YoutubeEmbed videoId={ffp2027VideoId} />
            </div>
          )}
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
        <Link href={`/${cohort}/directory`} className="directory-cta-btn reveal d3">
          Open Directory
          <svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-l">
          <Image src="/mesa-logos/mesa-logomark.png" alt="Mesa" width={22} height={22} quality={100} unoptimized style={{ borderRadius: 5, display: 'block', flexShrink: 0 }} />
          Built by <a href="https://mesaschool.co">Mesa School of Business</a> &nbsp;&middot;&nbsp; Future Founder&apos;s Summer School {cohortYear}
        </div>
        <div className="footer-r">{SITE_HOST}</div>
      </footer>

      <LandingScripts />
    </>
  )
}

function AwardsCarousel({ awardBrands, allStudents }: { awardBrands: BrandShape[] | null; allStudents: StudentBasic[] | null }) {
  const brands = awardBrands || []
  return (
    <div className="awards-carousel reveal d3" id="awardsCarousel" role="region" aria-label="Awards">
      <div className="awards-viewport" aria-live="polite" aria-atomic="true">
        <div className="awards-track" id="awardsTrack">
          {brands.map((brand) => {
            const students = allStudents?.filter(s => s.brand_id === brand.id) || []
            const founderNames = [...new Set(students.map((s) => s.name))].join(', ')
            const awards = Array.isArray(brand.awards) ? brand.awards : []
            return (
              <div key={brand.slug} className="feat-card feat-card-track">
                <div className="feat-card-photo">
                  {brand.feature_photo
                    ? <FeatCardImage src={brand.feature_photo} alt={brand.name} />
                    : null}
                </div>
                <div className="feat-card-body">
                  <div className="feat-card-name">{brand.name}</div>
                  {awards.length > 0 && (
                    <div className="feat-card-awards">
                      {awards.map((award: string, i: number) => (
                        <span key={i} className="feat-card-award">{award}</span>
                      ))}
                    </div>
                  )}
                  {founderNames && <div className="feat-card-founders">{founderNames}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="awards-controls">
        <button className="awards-arrow" id="awardsPrev" aria-label="Previous">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="awards-dots" id="awardsDots"></div>
        <button className="awards-arrow" id="awardsNext" aria-label="Next">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
  var cards = track.querySelectorAll('.feat-card-track');
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

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function startAuto() { if (reducedMotion.matches) return; stopAuto(); autoTimer = setInterval(next, 2000); }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
  reducedMotion.addEventListener('change', function() { reducedMotion.matches ? stopAuto() : startAuto(); });

  document.getElementById('awardsNext').addEventListener('click', function() { next(); startAuto(); });
  document.getElementById('awardsPrev').addEventListener('click', function() { prev(); startAuto(); });
  // Pause-on-hover only where a real pointer hovers. On touch, a tap fires a
  // phantom mouseenter with no matching mouseleave, which would stop the
  // auto-rotate permanently — so skip these listeners on touch devices.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
  }

  buildDots();
  startAuto();
  window.addEventListener('resize', function() { buildDots(); goTo(Math.min(currentIdx, maxIdx())); });
})();
    `}</Script>
  )
}
