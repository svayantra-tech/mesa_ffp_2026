import mongoose from 'mongoose'
import dns from 'node:dns'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import XLSX from 'xlsx'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Config ──────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')
const SITE = 'https://ffp.mesaschool.me'

// DNS override for Atlas SRV
if (process.env.MONGODB_DNS) {
  dns.setServers(process.env.MONGODB_DNS.split(',').map(s => s.trim()))
}

// ── Connect ─────────────────────────────────────────────────────────────
await mongoose.connect(MONGODB_URI, { bufferCommands: false })

const Student = mongoose.connection.collection('students')

// ── Pull both cohorts ───────────────────────────────────────────────────
const students = await Student.find(
  {},
  { projection: { name: 1, slug: 1, cohort: 1 } }
).sort({ name: 1 }).toArray()

const cohort1 = students.filter(s => s.cohort === 'cohort-1')
const cohort2 = students.filter(s => s.cohort === 'cohort-2')

// ── Build sheets ────────────────────────────────────────────────────────
function makeSheetData(list, cohort) {
  const rows = [['Student Name', 'Portfolio URL']]
  for (const s of list) {
    rows.push([s.name, `${SITE}/${cohort}/${s.slug}`])
  }
  return rows
}

const wb = XLSX.utils.book_new()

const ws1 = XLSX.utils.aoa_to_sheet(makeSheetData(cohort1, 'cohort-1'))
ws1['!cols'] = [{ wch: 30 }, { wch: 60 }]
XLSX.utils.book_append_sheet(wb, ws1, 'Cohort 1')

const ws2 = XLSX.utils.aoa_to_sheet(makeSheetData(cohort2, 'cohort-2'))
ws2['!cols'] = [{ wch: 30 }, { wch: 60 }]
XLSX.utils.book_append_sheet(wb, ws2, 'Cohort 2')

// ── Write file ──────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(__dirname, '..', 'student_portfolio_urls.xlsx')
XLSX.writeFile(wb, outPath)

console.log(`✅ Written ${cohort1.length} (Cohort 1) + ${cohort2.length} (Cohort 2) = ${students.length} students to ${outPath}`)

await mongoose.disconnect()
process.exit(0)
