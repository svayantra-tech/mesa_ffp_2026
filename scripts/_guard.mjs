// Safety rails for DB-writing .mjs scripts (see _guard.ts for the .ts version).
// Call hardenOrExit('<name>') at the top, before connecting/writing.
export function resolvedDbName() {
  const uri = process.env.MONGODB_URI || ''
  return (uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/) || [])[1] || '(unknown)'
}
export function isDryRun() {
  return process.env.DRY_RUN !== 'false' // default TRUE
}
export function hardenOrExit(label = 'write-script') {
  const dry = isDryRun()
  const db = resolvedDbName()
  console.log(`[guard] ${label}: db=${db} DRY_RUN=${dry}`)
  if (dry) {
    console.log('◆ DRY RUN (default). No writes will be made. Set DRY_RUN=false to write.')
    process.exit(0)
  }
  if (db === 'database' && !process.argv.includes('--i-mean-prod')) {
    console.error('ABORT: resolved DB is PROD ("database") with DRY_RUN=false. Re-run with --i-mean-prod to confirm a real prod write.')
    process.exit(2)
  }
}
