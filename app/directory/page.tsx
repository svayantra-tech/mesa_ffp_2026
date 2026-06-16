import Link from 'next/link'
import { getDirectoryStudents } from '@/lib/data'
import DirectoryClient from './DirectoryClient'

export const revalidate = 3600

export default async function DirectoryPage() {
  const students = await getDirectoryStudents()

  return (
    <div className="directory-page">
      <nav>
        <div className="nav-left">
          <Link href="/">
            <img src="/assets/mesa-logo.png" alt="Mesa School of Business" className="nav-logo" />
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

      <DirectoryClient students={students} />

      <footer>
        <div className="footer-l">
          <div className="footer-mark">
            <svg viewBox="0 0 20 20" fill="none">
              <rect x="3" y="11" width="14" height="2" rx="1" fill="white" />
              <rect x="3" y="7.5" width="14" height="2" rx="1" fill="white" />
              <rect x="6" y="3" width="8" height="5" rx="1.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          Built by <a href="https://mesaschool.co">Mesa School of Business</a> &nbsp;&middot;&nbsp; FFP 2026
        </div>
        <div className="footer-r">ffp.mesaschool.co</div>
      </footer>
    </div>
  )
}
