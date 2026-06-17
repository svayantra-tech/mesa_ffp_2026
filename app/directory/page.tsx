import Link from 'next/link'
import Image from 'next/image'
import { getDirectoryStudents } from '@/lib/data'
import DirectoryClient from './DirectoryClient'

// Always read live DB so the directory never serves a stale build.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DirectoryPage() {
  const students = await getDirectoryStudents()
  const ventureCount = new Set(
    students.map((s) => s.brand?.name).filter(Boolean)
  ).size

  return (
    <div className="directory-page">
      <nav>
        <div className="nav-left">
          <Link href="/">
            <Image src="/assets/mesa-logo.png" alt="Mesa School of Business" width={75} height={28} quality={100} className="nav-logo" priority />
          </Link>
        </div>
        <div className="nav-center">
          <Link href="/">Home</Link>
          <a href="#" style={{ color: '#BA3B41' }}>Directory</a>
        </div>
        <Link href="/" className="nav-cta">
          <svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Home
        </Link>
      </nav>

      <DirectoryClient students={students} ventureCount={ventureCount} />

      <footer>
        <div className="footer-l">
          <Image src="/mesa-logos/mesa-logomark.png" alt="Mesa" width={22} height={22} quality={100} unoptimized style={{ borderRadius: 5, display: 'block', flexShrink: 0 }} />
          Built by <a href="https://mesaschool.co">Mesa School of Business</a> &nbsp;&middot;&nbsp; FFP 2026
        </div>
        <div className="footer-r">ffp.mesaschool.co</div>
      </footer>
    </div>
  )
}
