import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import MarketingAssets from './MarketingAssets'
import AITools from './AITools'
import Awards from './Awards'

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
  const brandName = Array.isArray(student?.brand) ? student.brand[0]?.name : (student?.brand as any)?.name
  return {
    title: `${student?.name} — FFP 2026 Portfolio · Mesa`,
    openGraph: {
      title: `${student?.name} — FFP 2026 Portfolio · Mesa`,
      description: brandName ? `${brandName}` : 'Future Founder\'s Summer School 2026',
      images: [{ url: '/assets/mesa-logo.png' }],
    },
  }
}

function formatRevenue(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
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

function getCertImageUrl(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null
  return `https://drive.google.com/file/d/${match[1]}/preview`
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
  const certImageUrl = getCertImageUrl(student.certificate_url)
  const awards: string[] = Array.isArray(brand?.awards) ? brand.awards : []
  const videos: string[] = Array.isArray(brand?.videos) ? brand.videos.slice(0, 3) : []
  const adStatics: string[] = Array.isArray(brand?.ad_statics) ? brand.ad_statics.slice(0, 2) : []
  const fleaPhotos: string[] = Array.isArray(brand?.flea_photos) ? brand.flea_photos : []
  const demoPhotos: string[] = Array.isArray(brand?.demo_photos) ? brand.demo_photos : []

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
        <button className="nav-share" id="share-btn" data-name={student.name}>
          <svg viewBox="0 0 16 16"><path d="M4 8V4h4M8 4l4 4M10 10v4H2V6" /></svg>
          Share portfolio
        </button>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ borderTop: 'none', padding: 0 }}>
        <div className="hero-left">
          <div className="cohort-pill">
            <div className="cohort-dot"><svg viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <span className="cohort-text">Future Founder&apos;s Summer School &middot; Cohort 1 &middot; 2026</span>
          </div>
          <h1 className="hero-name">
            {student.name.split(' ')[0]} <span className="hero-name-last">{student.name.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="hero-role">FFP Graduate &middot; Mesa School of Business &middot; Bangalore</p>
          <div className="hero-product">
            <strong>{brand?.name}</strong>
            <p>{brand?.description}</p>
          </div>
          <div className="metrics-strip">
            <div className="mc"><div className="mc-val red">{formatRevenue(brand?.revenue || 0)}</div><div className="mc-lbl">Revenue</div></div>
            <div className="mc"><div className="mc-val">{brand?.customers || 0}</div><div className="mc-lbl">Customers</div></div>
          </div>
          <div className="hero-ctas">
            {brand?.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer" className="btn-r">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="5.5" /><line x1="1" y1="6.5" x2="12" y2="6.5" /><ellipse cx="6.5" cy="6.5" rx="2.2" ry="5.5" /></svg>
                {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
            {brand?.instagram && (
              <a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer" className="btn-o">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="9" height="9" rx="2.5" /><circle cx="6.5" cy="6.5" r="2" /><circle cx="9.5" cy="3.5" r="0.6" fill="currentColor" /></svg>
                {getInstagramHandle(brand.instagram)}
              </a>
            )}
            {student.email && (
              <a href={`mailto:${student.email}`} className="btn-g">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2.5" width="11" height="8" rx="1.5" /><path d="M1 3.5l5.5 4 5.5-4" /></svg>
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
      <section id="product" className="on-cream reveal portfolio-section">
        <div className="sec-tag">04 — Business Built</div>
        <h2 className="sec-h">Business Built</h2>
        <p className="sec-sub">Designed, Built, and Scaled to Real Revenue in 2 Weeks</p>
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
                <svg viewBox="0 0 15 15"><circle cx="7.5" cy="7.5" r="6" /><line x1="1.5" y1="7.5" x2="13.5" y2="7.5" /><ellipse cx="7.5" cy="7.5" rx="2.5" ry="6" /></svg>
                <div><div className="ic-label">Website</div><div className="ic-val"><a href={brand.website} target="_blank" rel="noopener noreferrer">{brand.website.replace(/^https?:\/\//, '')} &#8599;</a></div></div>
              </div>
            )}
            {brand?.instagram && (
              <div className="info-chip reveal d3">
                <svg viewBox="0 0 15 15"><rect x="2" y="2" width="11" height="11" rx="3" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="11" cy="4" r="0.8" fill="#BA3B41" /></svg>
                <div><div className="ic-label">Instagram</div><div className="ic-val"><a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer">{getInstagramHandle(brand.instagram)} &#8599;</a></div></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section id="proof" className="on-white reveal portfolio-section">
        <div className="sec-tag">06 &middot; 07 &middot; 14 &middot; 15 — Proof of work</div>
        <h2 className="sec-h">The Outcome</h2>
        <p className="sec-sub">Real outcomes from 2 weeks of execution. Revenue generated, customers served, events attended.</p>
        <div className="proof-cards">
          <div className="pc acc reveal d1"><div className="pc-val">{formatRevenue(brand?.revenue || 0)}</div><div className="pc-lbl">Revenue generated</div></div>
          <div className="pc lite reveal d2"><div className="pc-val">{brand?.customers || 0}</div><div className="pc-lbl">Customers reached</div></div>
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
            <div className="event-cap"><div className="event-cap-title">Students Sold to Real Customers in Vega City Mall, Bannerghatta</div></div>
          </div>
          <div className="event-card reveal d2">
            <div className="carousel-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="c-slide active">
                <svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="18" rx="2" fill="none" strokeWidth="1.5" /><path d="M12 28h8M16 22v6" /></svg>
                <span>Demo day</span>
              </div>
            </div>
            <div className="event-cap"><div className="event-cap-title">Students Took the Stage to Pitch Their Ventures to Venture Capitalists from Tier-1 VCs</div></div>
          </div>
        </div>
      </section>

      {/* ASSETS */}
      <MarketingAssets videos={videos} adStatics={adStatics} />

      {/* AI TOOLS */}
      <AITools />

      {/* AWARDS */}
      <Awards awards={awards} studentName={student.name} demoPhotos={demoPhotos} />

      {/* CERTIFICATE */}
      <section id="cert" className="on-cream reveal portfolio-section">
        <div className="sec-tag">11 — Programme Certification</div>
        <h2 className="sec-h">Programme Certification</h2>
        <div className="cert-center">
          {certImageUrl ? (
            <div className="cert-frame reveal d1">
              <iframe
                src={certImageUrl}
                width="100%"
                height="520px"
                style={{ border: 'none', borderRadius: '8px' }}
                allow="autoplay"
                title="Certificate of Completion"
              />
            </div>
          ) : (
            <div className="cert-pending-card reveal d1">
              <img src="/assets/mesa-logo.png" alt="Mesa School of Business" width="48" height="48" style={{ objectFit: 'contain' }} />
              <div className="cert-pending-title">Certificate of Entrepreneurship</div>
              <div className="cert-pending-sub">Issued by Mesa School of Business &middot; FFP 2026</div>
            </div>
          )}
          {certImageUrl ? (
            <a
              href={certImageUrl}
              download
              className="cert-download active"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 2v9M4 8l4 4 4-4M2 13h12" />
              </svg>
              Download Certificate
            </a>
          ) : (
            <span className="cert-download disabled">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 2v9M4 8l4 4 4-4M2 13h12" />
              </svg>
              Certificate Pending
            </span>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <div className="contact-bar reveal">
        <div>
          <div className="contact-title">Get in touch</div>
          <div className="contact-email">
            {student.email && <>{student.email}</>}
            {student.email && brand?.instagram && <> &nbsp;&middot;&nbsp; </>}
            {brand?.instagram && <a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer">{getInstagramHandle(brand.instagram)}</a>}
          </div>
        </div>
        <div className="contact-btns">
          {brand?.instagram && (
            <a href={getInstagramUrl(brand.instagram)} target="_blank" rel="noopener noreferrer" className="cbtn-w">Instagram &#8599;</a>
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
