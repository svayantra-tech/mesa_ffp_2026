import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { isValidCohort, getCohort } from '@/lib/cohorts'
import { instagramUrl, sanitizeInstagramHandle, truncateInstagramLabel, sanitizeWebsiteForDisplay, websiteHref } from '@/lib/instagram'
import { SITE_URL, SITE_HOST } from '@/lib/site'
import { getEnabledCohorts } from '@/lib/cohort-visibility'
import { getStudentBySlug, getStudentMeta, type StudentShape, type BrandShape } from '@/lib/db/queries'
import MarketingAssets from '@/app/[slug]/MarketingAssets'
import AITools from '@/app/[slug]/AITools'
import Awards from '@/app/[slug]/Awards'
import PersonalGrowth from '@/app/[slug]/PersonalGrowth'
import CertificateViewer from '@/app/[slug]/CertificateViewerClient'
import MomentGrid from '@/app/[slug]/MomentGrid'
import CohortSwitcher from '@/app/components/CohortSwitcher'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Params = { cohort: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { cohort, slug } = await params
  if (!isValidCohort(cohort)) return {}
  const student = await getStudentMeta(cohort, slug)
  const brandName = student?.brand?.name
  const year = getCohort(cohort)?.year ?? 2026
  const title = `${student?.name} — FFP ${year} Portfolio · Mesa`
  return {
    title,
    openGraph: {
      title,
      description: brandName ? `${brandName}` : `Future Founder's Summer School ${year}`,
      images: [{ url: '/mesa-logos/pfp.png', width: 1200, height: 630 }],
    },
  }
}

function extractDriveId(url: string): string | null {
  if (!url) return null
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
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

export default async function PortfolioPage({ params }: { params: Promise<Params> }) {
  const { cohort, slug } = await params
  if (!isValidCohort(cohort)) notFound()

  const [student, enabledCohorts] = await Promise.all([
    getStudentBySlug(cohort, slug),
    getEnabledCohorts(),
  ])
  if (!student) notFound()

  const brand = student.brand
  const cohortMeta = getCohort(cohort)
  const cohortLabel = cohortMeta ? `${cohortMeta.name} · ${cohortMeta.year}` : cohort
  const hasCert = !!student.certificate_url?.match(/\/file\/d\/[a-zA-Z0-9_-]+/)
  const awards: string[] = Array.isArray(brand?.awards) ? brand.awards : []
  const awardDescriptions: string[] = Array.isArray(brand?.award_descriptions) ? brand.award_descriptions : []
  // F4 (AWAITING SIGN-OFF): no truncation — render every video/static; the grid reflows
  // by count. cohort-2 has 4 videos / 3 statics per brand; 11 cohort-1 brands have >2 statics.
  const videos: string[] = Array.isArray(brand?.videos) ? brand.videos : []
  const adStatics: string[] = Array.isArray(brand?.ad_statics) ? brand.ad_statics : []
  const hasCreatives = videos.length > 0 || adStatics.some((url) => url.startsWith('http'))
  const hasProfile = !!student.profile_photo
  const cleanUrl = (u: string) => (u.startsWith('http') ? u : '')
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
          <Link href={`/${cohort}`} className="nav-wordmark">
            Mesa <span>FFP</span> &middot; 2026
          </Link>
        </div>
        <div className="nav-center">
          {momentPhotos.length > 0 && <a href="#moments">Moments</a>}
          {hasCreatives && <a href="#creatives">Creatives</a>}
          <a href="#ai">AI Tools</a>
          {awards.length > 0 && <a href="#awards">Awards</a>}
          <a href="#cert">Certificate</a>
        </div>
        <CohortSwitcher cohorts={enabledCohorts} currentCohort={cohort} pageType="slug" slug={slug} />
        <button className="nav-share" id="share-btn" data-name={student.name} data-cohort={cohort} data-slug={slug}>
          <svg viewBox="0 0 16 16">
            <path d="M4 8V4h4M8 4l4 4M10 10v4H2V6" />
          </svg>
          <span className="nav-share-text">Share portfolio</span>
        </button>
      </nav>

      {/* SLIDE 1 — HERO */}
      <section className="slide slide-ivory">
        {hasProfile ? (
          <div className="hero-2col">
            <div className="hero-left">
              <HeroContent student={student} brand={brand} cohort={cohort} />
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
              <HeroContent student={student} brand={brand} cohort={cohort} />
            </div>
          </div>
        )}
      </section>

      {/* SLIDE 2 — MOMENTS */}
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

      {/* SLIDE 3 — MARKETING CREATIVES */}
      {hasCreatives && (
        <section className="slide slide-teal" id="creatives">
          <MarketingAssets videos={videos} adStatics={adStatics} />
        </section>
      )}

      {/* SLIDE 4 — AI TOOLS */}
      <AITools />

      {/* SLIDE 4.5 — PERSONAL GROWTH (hidden when empty) */}
      <PersonalGrowth text={student.personal_growth} />

      {/* SLIDE 5 — AWARDS (award photo is the brand's team photo) */}
      {awards.length > 0 && (
        <Awards
          awards={awards}
          award_descriptions={awardDescriptions}
          awardPhoto={brand?.award_photo}
        />
      )}

      {/* SLIDE 6 — CERTIFICATE */}
      {hasCert && (
        <section className="slide slide-butter" id="cert">
          <div className="cert-slide-inner">
            <h2 className="sec-heading" style={{ marginBottom: 6 }}>Programme Certification</h2>
            <p className="sec-intro" style={{ marginBottom: 32 }}>
              Issued by Mesa School of Business · FFP {cohortLabel}
            </p>
            <div className="cert-center">
              <div className="cert-frame">
                <CertificateViewer certUrl={student.certificate_url} />
              </div>
              <a
                href={`https://drive.google.com/uc?export=download&id=${extractDriveId(student.certificate_url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cert-download active"
              >
                <svg viewBox="0 0 16 16"><path d="M8 2v9M4 8l4 4 4-4M2 13h12" /></svg>
                Download Certificate
              </a>
            </div>
          </div>
        </section>
      )}

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
                <a href={websiteHref(brand.website)} target="_blank" rel="noopener noreferrer">
                  {sanitizeWebsiteForDisplay(brand.website)}
                </a>
              </div>
            )}
          </div>
          <div className="contact-btns">
            {brand?.website && (
              <a href={websiteHref(brand.website)} target="_blank" rel="noopener noreferrer" className="cbtn-w">
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
          <div className="footer-row-r">{SITE_HOST}/{cohort}/{slug}</div>
        </div>
      </section>

      <PortfolioScripts cohort={cohort} slug={slug} studentName={student.name} />
    </>
  )
}

function HeroContent({
  student,
  brand,
  cohort,
}: {
  student: StudentShape
  brand: BrandShape | null
  cohort: string
}) {
  const nameParts = student.name.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ')

  const cohortMeta = getCohort(cohort)
  const cohortLabel = cohortMeta ? `${cohortMeta.name} · ${cohortMeta.year}` : cohort

  const igHandle = brand ? sanitizeInstagramHandle(brand.instagram) : ''
  const igHref = brand ? instagramUrl(brand.instagram) : ''

  return (
    <>
      <div className="cohort-pill">
        <div className="cohort-dot">
          <svg viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="cohort-text">Future Founder Program &middot; {cohortLabel}</span>
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
        {Boolean(brand?.revenue) && (
          <div className="hs">
            <div className="hs-val crimson">{`₹${(brand!.revenue as number).toLocaleString('en-IN')}`}</div>
            <div className="hs-lbl">Revenue</div>
          </div>
        )}
        {Boolean(brand?.customers) && (
          <div className="hs">
            <div className="hs-val">{brand!.customers}</div>
            <div className="hs-lbl">Customers</div>
          </div>
        )}
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
          <a href={websiteHref(brand.website)} target="_blank" rel="noopener noreferrer" className="btn-r">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5.5" />
              <line x1="1" y1="6.5" x2="12" y2="6.5" />
              <ellipse cx="6.5" cy="6.5" rx="2.2" ry="5.5" />
            </svg>
            {sanitizeWebsiteForDisplay(brand.website)}
          </a>
        )}
        {brand?.instagram && igHandle && (
          <a href={igHref} target="_blank" rel="noopener noreferrer" className="btn-o" title={igHandle}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="9" height="9" rx="2.5" />
              <circle cx="6.5" cy="6.5" r="2" />
              <circle cx="9.5" cy="3.5" r="0.6" fill="currentColor" />
            </svg>
            {truncateInstagramLabel(igHandle)}
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

function PortfolioScripts({ cohort, slug, studentName }: { cohort: string; slug: string; studentName: string }) {
  return (
    <Script id="portfolio-scripts" strategy="afterInteractive">{`
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
}, {threshold: 0.12});
document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

var shareBtn = document.getElementById('share-btn');
if (shareBtn) {
  shareBtn.addEventListener('click', function() {
    var name = ${JSON.stringify(studentName)};
    var title = name + " FFP Portfolio \\u00b7 Mesa 2026";
    var url = "${SITE_URL}/${cohort}/${slug}";
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
