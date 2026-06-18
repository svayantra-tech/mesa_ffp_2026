/**
 * Route smoke test.
 * Run: npx tsx --env-file=.env.local scripts/smoke.ts
 * Optionally override base URL: BASE_URL=http://localhost:3000 npx tsx ...
 */

import mongoose from 'mongoose'
import { Student } from '../lib/models/Student'

const BASE = (process.env.BASE_URL ?? 'https://ffp.mesaschool.me').replace(/\/$/, '')

// Strings that indicate Next.js error boundary / unhandled error in rendered HTML.
const ERROR_PATTERNS = [
  'Application error:',
  'Unhandled Runtime Error',
  '__NEXT_ERROR__',
  'digest: &quot;',
  'Error: Minified React error',
  'chunkLoadError',
]

async function fetchPage(url: string): Promise<{ ok: boolean; status: number; errorSnippet?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FFP-smoke-test/1.0' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return { ok: false, status: res.status }
    const html = await res.text()
    for (const pat of ERROR_PATTERNS) {
      if (html.includes(pat)) {
        const idx = html.indexOf(pat)
        const snippet = html.slice(Math.max(0, idx - 40), idx + 120).replace(/\s+/g, ' ').trim()
        return { ok: false, status: res.status, errorSnippet: snippet }
      }
    }
    return { ok: true, status: res.status }
  } catch (err) {
    return { ok: false, status: 0, errorSnippet: String(err) }
  }
}

async function connectDB() {
  if (process.env.MONGODB_DNS) {
    const dns = await import('dns')
    dns.setServers([process.env.MONGODB_DNS])
    dns.setDefaultResultOrder('ipv4first')
  }
  await mongoose.connect(process.env.MONGODB_URI!)
}

async function main() {
  console.log(`\n🌐  Smoke-testing against: ${BASE}\n`)

  // Static routes first (no DB needed yet)
  const staticRoutes = ['/', '/directory']
  for (const route of staticRoutes) {
    const url = `${BASE}${route}`
    const result = await fetchPage(url)
    const icon = result.ok ? '✅' : '❌'
    console.log(`${icon}  ${url}  (${result.status})${result.errorSnippet ? '\n    ⚠ ' + result.errorSnippet : ''}`)
  }
  console.log()

  // Pull slugs from DB
  console.log('🔍  Connecting to MongoDB for slugs…')
  await connectDB()
  const students = await Student.find({}, { slug: 1 }).lean()
  await mongoose.disconnect()
  console.log(`✅  Found ${students.length} student slugs.\n`)

  const failures: string[] = []
  let pass = 0

  for (const s of students) {
    const url = `${BASE}/${s.slug}`
    const result = await fetchPage(url)
    if (result.ok) {
      pass++
    } else {
      failures.push(`${url}  (HTTP ${result.status})${result.errorSnippet ? '\n     ⚠ ' + result.errorSnippet : ''}`)
      process.stdout.write('❌')
    }
    // Show progress without flooding output
    if (pass % 10 === 0 && result.ok) process.stdout.write('.')
  }
  console.log('\n')

  console.log(`✅  Passed: ${pass} / ${students.length}`)
  if (failures.length) {
    console.log(`\n❌  Failures (${failures.length}):`)
    for (const f of failures) console.log(`  • ${f}`)
  } else {
    console.log('🎉  All portfolio pages returned 200 with no error boundaries.\n')
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
