import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Future Founder's Summer School 2026 · Mesa",
  description: '113 students. 29 ventures. 2 weeks.',
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
