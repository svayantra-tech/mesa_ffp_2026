import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mesa-ffp-2026.vercel.app'),
  title: "Future Founder's Summer School 2026 · Mesa",
  description: '113 students. 29 ventures. 2 weeks. Real revenue.',
  openGraph: {
    title: "Future Founder's Summer School 2026 · Mesa",
    description: '113 students. 29 ventures. 2 weeks. Real revenue.',
    url: 'https://mesa-ffp-2026.vercel.app',
    siteName: 'Mesa FFP 2026',
    images: [{ url: '/mesa-logos/pfp.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Future Founder's Summer School 2026 · Mesa",
    description: '113 students. 29 ventures. 2 weeks.',
    images: ['/mesa-logos/pfp.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  )
}
