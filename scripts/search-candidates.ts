import 'dotenv/config'
import { connectDB } from '../lib/mongodb'
import { Student } from '../lib/models/Student'

const tokens = ['Dhruvi', 'Divyansha', 'Zhakhi', 'Divyta', 'Hitarth', 'Reyansh', 'Navya']

async function main() {
  await connectDB()

  for (const token of tokens) {
    const hits = await Student.find(
      { name: { $regex: token, $options: 'i' } },
      'name slug email'
    ).lean()

    if (hits.length === 0) {
      console.log(`${token}: no candidate — genuinely missing`)
    } else {
      console.log(`${token}:`)
      for (const h of hits) {
        console.log(`  slug=${h.slug}  name="${h.name}"  email=${h.email || '(none)'}`)
      }
    }
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
