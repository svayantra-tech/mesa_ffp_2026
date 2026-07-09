import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
})

// Production host drives og:url / og:image. Set NEXT_PUBLIC_SITE_URL in Vercel;
// fall back to the per-deploy VERCEL_URL for preview builds, then a sane default.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ffp.mesaschool.me')

// Generic fallback copy (no cohort-specific numbers). Cohort landing pages override
// title/description via their own generateMetadata() with live counts.
const SITE_TITLE = "Future Founder's Summer School · Mesa"
const SITE_DESC = 'Real ventures, real revenue — built by teen founders at Mesa School of Business.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: 'Mesa FFP',
    images: [{ url: '/mesa-logos/pfp.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ['/mesa-logos/pfp.png'],
  },
  icons: {
    icon: '/mesa-logos/icon.png',
    apple: '/mesa-logos/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  )
}
