import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://mesa-ffp-2026.vercel.app'),
  title: "Future Founder's Summer School 2026 · Mesa",
  description: '113 students. 29 ventures. 2 weeks. Real revenue.',
  icons: {
    icon: '/assets/mesa-logo.png',
    apple: '/assets/mesa-logo.png',
  },
  openGraph: {
    title: "Future Founder's Summer School 2026 · Mesa",
    description: '113 students. 29 ventures. 2 weeks. Real revenue.',
    url: 'https://mesa-ffp-2026.vercel.app',
    siteName: 'Mesa FFP 2026',
    images: [{ url: '/assets/mesa-logo.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Future Founder's Summer School 2026 · Mesa",
    description: '113 students. 29 ventures. 2 weeks.',
    images: ['/assets/mesa-logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
