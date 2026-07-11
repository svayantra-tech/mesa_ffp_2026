/**
 * Safety rails for DB-writing scripts. Call `hardenOrExit('<name>')` at the very top
 * of the script's execution, BEFORE it connects or writes.
 *
 * Behaviour (rails only — no script's core logic is changed):
 *   - DRY_RUN defaults to TRUE. In dry-run the script prints a notice and EXITS before
 *     connecting, so a bare `npx tsx scripts/X.ts` never writes.
 *   - To actually write you must pass DRY_RUN=false.
 *   - If the resolved DB is prod ("database") AND DRY_RUN=false, it also requires an
 *     explicit `--i-mean-prod` flag before proceeding.
 */
export function resolvedDbName(): string {
  const uri = process.env.MONGODB_URI || ''
  return (uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/) || [])[1] || '(unknown)'
}

export function isDryRun(): boolean {
  return process.env.DRY_RUN !== 'false' // default TRUE
}

export function hardenOrExit(label = 'write-script'): void {
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
