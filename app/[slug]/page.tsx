import { getStudentBySlug, getStudentMeta, type StudentShape, type BrandShape } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import MarketingAssets from './MarketingAssets'
import AITools from './AITools'
import Awards from './Awards'
import CertificateViewer from './CertificateViewerClient'
import MomentGrid from './MomentGrid'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const student = await getStudentMeta(slug)
  const brandName = student?.brand?.name
  return {
    title: `${student?.name} — FFP 2026 Portfolio · Mesa`,
    openGraph: {
      title: `${student?.name} — FFP 2026 Portfolio · Mesa`,
      description: brandName ? `${brandName}` : "Future Founder's Summer School 2026",
      images: [{ url: '/mesa-logos/pfp.png', width: 1200, height: 630 }],
    },
  }
}

function getInstagramUrl(instagram: string): string {
  if (instagram.startsWith('http')) return instagram
  return `https://instagram.com/${instagram.replace('@', '')}`
}

function getInstagramHandle(instagram: string): string {
  const match = instagram.match(/instagram\.com\/([^/]+)/)
  if (match) return `@${match[1]}`
  return instagram.startsWith('@') ? instagram : `@${instagram}`
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const student = await getStudentBySlug(slug)
  if (!student) notFound()

  const brand = student.brand
  const hasCert = !!student.certificate_url?.match(/\/file\/d\/[a-zA-Z0-9_-]+/)
  const awards: string[] = Array.isArray(brand?.awards) ? brand.awards : []
  const awardDescriptions: string[] = Array.isArray(brand?.award_descriptions) ? brand.award_descriptions : []
  const videos: string[] = Array.isArray(brand?.videos) ? brand.videos.slice(0, 3) : []

  const hasProfile = !!student.profile_photo

  // Discard junk values (bare filenames, placeholder text) — keep only real URLs
  const cleanUrl = (u: string) => (u.startsWith('http') ? u : '')

  // Moment photos: convocation first, then flea market, then demo day
  const momentPhotos = [
    { src: cleanUrl(student.convocation_photo), caption: 'Convocation Ceremony' },
    { src: cleanUrl(student.flea_market_photo), caption: 'Flea Market · Vega City Mall' },
    { src: cleanUrl(student.demo_day_photo), caption: 'Demo Day Pitch' },
  ].filter((m) => !!m.src)

  const isPlaceholderEmail = student.email.endsWith('@placeholder.ffp')

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-left">
          <Image
            src="/mesa-logos/mesa-logomark.png"
            alt="Mesa"
            width={30}
            height={30}
            quality={100}
            unoptimized
            style={{ borderRadius: 7, display: 'block', flexShrink: 0 }}
          />
          <Link href="/" className="nav-wordmark">
            Mesa <span>FFP</span> &middot; 2026
          </Link>
        </div>
        <div className="nav-center">
          {momentPhotos.length > 0 && <a href="#moments">Moments</a>}
          {videos.length > 0 && <a href="#videos">Videos</a>}
          <a href="#ai">AI Tools</a>
          {awards.length > 0 && <a href="#awards">Awards</a>}
          <a href="#cert">Certificate</a>
        </div>
        <button className="nav-share" id="share-btn" data-name={student.name}>
          <svg viewBox="0 0 16 16">
            <path d="M4 8V4h4M8 4l4 4M10 10v4H2V6" />
          </svg>
          Share portfolio
        </button>
      </nav>

      {/* SLIDE 1 — HERO */}
      <section className="slide slide-ivory">
        {hasProfile ? (
          <div className="hero-2col">
            <div className="hero-left">
              <HeroContent student={student} brand={brand} />
            </div>
            <div className="hero-photo-panel">
              <div className="hero-photo-frame">
                <Image
                  src={student.profile_photo}
                  alt={student.name}
                  width={0}
                  height={0}
                  sizes="38vw"
                  quality={100}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="hero-1col">
            <div className="hero-left">
              <HeroContent student={student} brand={brand} />
            </div>
          </div>
        )}
      </section>

      {/* SLIDE 2 — MOMENTS (hidden if all photos missing) */}
      {momentPhotos.length > 0 && (
        <section className="slide slide-ivory" id="moments">
          <div className="moments-inner">
            <div className="moments-hd">
              <h2 className="sec-heading">Moments</h2>
              <p className="sec-intro">Captured during FFP 2026 — Convocation, Flea Market, and Demo Day.</p>
            </div>
            <MomentGrid photos={momentPhotos} />
          </div>
        </section>
      )}

      {/* SLIDE 3 — VIDEO CREATIVES (hidden if no videos) */}
      {videos.length > 0 && (
        <section className="slide slide-teal" id="videos">
          <MarketingAssets videos={videos} />
        </section>
      )}

      {/* SLIDE 4 — AI TOOLS */}
      <AITools />

      {/* SLIDE 5 — AWARDS (hidden if no awards) */}
      {awards.length > 0 && <Awards awards={awards} award_descriptions={awardDescriptions} studentName={student.name} />}

      {/* SLIDE 6 — CERTIFICATE */}
      <section className="slide slide-butter" id="cert">
        <div className="cert-slide-inner">
          <h2 className="sec-heading" style={{ marginBottom: 6 }}>Programme Certification</h2>
          <p className="sec-intro" style={{ marginBottom: 32 }}>
            Issued by Mesa School of Business · FFP Cohort 1 · 2026
          </p>
          <div className="cert-center">
            {hasCert ? (
              <div className="cert-frame">
                <CertificateViewer certUrl={student.certificate_url} />
              </div>
            ) : (
              <div className="cert-pending-card">
                <Image
                  src="/assets/mesa-logo.png"
                  alt="Mesa School of Business"
                  width={48}
                  height={48}
                  quality={100}
                  style={{ objectFit: 'contain' }}
                />
                <div className="cert-pending-title">Certificate of Entrepreneurship</div>
                <div className="cert-pending-sub">Issued by Mesa School of Business · FFP 2026</div>
              </div>
            )}
            {hasCert ? (
              <a
                href={`/api/cert?url=${encodeURIComponent(student.certificate_url)}`}
                download
                className="cert-download active"
              >
                <svg viewBox="0 0 16 16"><path d="M8 2v9M4 8l4 4 4-4M2 13h12" /></svg>
                Download Certificate
              </a>
            ) : (
              <span className="cert-download disabled">
                <svg viewBox="0 0 16 16"><path d="M8 2v9M4 8l4 4 4-4M2 13h12" /></svg>
                Certificate Pending
              </span>
            )}
          </div>
        </div>
      </section>

      {/* SLIDE 7 — GET IN TOUCH + FOOTER */}
      <section className="slide contact-footer-slide" id="contact">
        <div className="contact-watermark">{brand?.name ?? 'Mesa'}</div>
        <div className="contact-footer-top">
          <h2 className="contact-heading">Get in touch</h2>
          <div className="contact-details">
            {!isPlaceholderEmail && student.email && <div>{student.email}</div>}
            {brand?.instagram && (
              <div>
                <a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer">
                  {getInstagramHandle(brand.instagram)}
                </a>
              </div>
            )}
            {brand?.website && (
              <div>
                <a href={brand.website} target="_blank" rel="noopener noreferrer">
                  {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </div>
            )}
          </div>
          <div className="contact-btns">
            {brand?.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer" className="cbtn-w">
                Website &#8599;
              </a>
            )}
            {brand?.instagram && (
              <a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer" className="cbtn-o">
                Instagram &#8599;
              </a>
            )}
            {!isPlaceholderEmail && student.email && (
              <a href={`mailto:${student.email}`} className="cbtn-o">
                Email
              </a>
            )}
          </div>
        </div>
        <hr className="contact-footer-divider" />
        <div className="footer-row">
          <div className="footer-row-l">
            Built by{' '}
            <Link href="https://mesaschool.co">Mesa School of Business</Link>
            {' '}&middot; FFP 2026 &middot; Not student-editable
          </div>
          <div className="footer-row-r">ffp.mesaschool.co/{slug}</div>
        </div>
      </section>

      <PortfolioScripts />
    </>
  )
}

// Hero inner content — shared between 1-col and 2-col layouts
function HeroContent({ student, brand }: { student: StudentShape; brand: BrandShape | null }) {
  const nameParts = student.name.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ')

  return (
    <>
      <div className="cohort-pill">
        <div className="cohort-dot">
          <svg viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="cohort-text">Future Founder Program &middot; Cohort 1 &middot; 2026</span>
      </div>

      <h1 className="hero-name">
        {firstName}{lastName ? <> <span className="hero-name-last">{lastName}</span></> : null}
      </h1>
      <p className="hero-role">FFP Graduate &middot; Mesa School of Business &middot; Bangalore</p>

      {brand && (
        <div className="hero-product">
          <strong>{brand.name}</strong>
          <p>{brand.description}</p>
        </div>
      )}

      <div className="hero-stats">
        <div className="hs">
          <div className="hs-val crimson">{`₹${(brand?.revenue || 0).toLocaleString('en-IN')}`}</div>
          <div className="hs-lbl">Revenue</div>
        </div>
        <div className="hs">
          <div className="hs-val">{brand?.customers || 0}</div>
          <div className="hs-lbl">Customers</div>
        </div>
        <div className="hs">
          <div className="hs-val">Pan India</div>
          <div className="hs-lbl">Markets</div>
        </div>
        <div className="hs">
          <div className="hs-val">Jun &apos;26</div>
          <div className="hs-lbl">Demo Day</div>
        </div>
      </div>

      <div className="hero-ctas">
        {brand?.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer" className="btn-r">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5.5" />
              <line x1="1" y1="6.5" x2="12" y2="6.5" />
              <ellipse cx="6.5" cy="6.5" rx="2.2" ry="5.5" />
            </svg>
            {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
        {brand?.instagram && (
          <a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer" className="btn-o">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="9" height="9" rx="2.5" />
              <circle cx="6.5" cy="6.5" r="2" />
              <circle cx="9.5" cy="3.5" r="0.6" fill="currentColor" />
            </svg>
            {getInstagramHandle(brand.instagram)}
          </a>
        )}
        {student.email && (
          <a href={`mailto:${student.email}`} className="btn-g">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2.5" width="11" height="8" rx="1.5" />
              <path d="M1 3.5l5.5 4 5.5-4" />
            </svg>
            Email
          </a>
        )}
      </div>
    </>
  )
}

function PortfolioScripts() {
  return (
    <Script id="portfolio-scripts" strategy="afterInteractive">{`
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold: 0.12});
document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

var shareBtn = document.getElementById('share-btn');
if (shareBtn) {
  shareBtn.addEventListener('click', function() {
    var name = shareBtn.getAttribute('data-name') || 'Student';
    var title = name + " FFP Portfolio \\u00b7 Mesa 2026";
    var url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function(){});
    } else {
      navigator.clipboard.writeText(url).then(function() {
        var toast = document.createElement('div');
        toast.textContent = 'Link copied!';
        toast.className = 'share-toast';
        document.body.appendChild(toast);
        setTimeout(function() { toast.classList.add('visible'); }, 10);
        setTimeout(function() { toast.classList.remove('visible'); setTimeout(function() { toast.remove(); }, 300); }, 2500);
      });
    }
  });
}
    `}</Script>
  )
}
