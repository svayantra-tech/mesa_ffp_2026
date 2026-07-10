# scripts/ inventory (D1/D2)

Legend: **writes** = contains create/update/delete/save. **DRY_RUN** = has a dry-run default.
**direct** = imports `lib/models/*` directly (bypasses the `lib/db/queries.ts` choke point, D2).

| Script | Writes DB | DRY_RUN default | Cohort-scoped | Notes |
|---|---|---|---|---|
| `import-cohort2.ts` | YES | **none** | cohort-2 (const) | writes on `npx tsx` with no args |
| `import-ad-statics.ts` | YES | **none** | filter | writes immediately |
| `import-student-photos.ts` | YES | **none** | filter | writes immediately |
| `import-cohort2-certs-v2.ts` | YES | **none** | cohort-2 | writes immediately |
| `import-cohort2-convocation-awards.ts` | YES | **none** | cohort-2 | writes immediately |
| `import-cohort2-growth-awards.ts` | YES | **none** | cohort-2 | writes immediately |
| `rehost-cohort2-media.ts` | YES | **none** | cohort-2 | writes immediately |
| `import-c2-photos.ts` | YES | **DRY_RUN=true** (env, `!== 'false'`) | cohort-2 | the one good pattern |
| `migrate-cohort2-awards-split.ts` | YES | **none** (idempotent) | cohort-2 | writes immediately |
| `migrate-cohorts.ts` | YES | **none** | **all cohorts** | can touch every cohort |
| `copy-db.mjs` | YES | **none** | **all** | DB→DB copy; destructive potential |
| `migrate-to-mongo.mjs` | YES | `DRY_RUN=process.argv…` | all | Supabase→Mongo one-off |
| `audit.ts` | **YES** | none | — | **named "audit" but MUTATES** — footgun |
| `audit-photo-collisions.ts` | no | n/a | both (read) | read-only ✓ |
| `full-audit.ts` | no | n/a | read | read-only |
| `search-candidates.ts` | no | n/a | read | read-only |
| `smoke.ts`, `smoke-isolation.ts` | no | n/a | read | read-only |

**D1 finding:** the project's stated rule ("every migration DRY_RUN=true default, idempotent,
rollback JSON") is met by **only** `import-c2-photos.ts`. Every other write-script writes to
**production** on `npx tsx scripts/<x>.ts` with no arguments and no confirmation.
`audit.ts` writes despite its name.

**D2 finding:** **14 scripts import `lib/models/*` directly**, bypassing `lib/db/queries.ts`.
The choke-point rule is enforced in `app/` but **never** in `scripts/`. Most are cohort-scoped
by explicit filters, but `migrate-cohorts.ts` and `copy-db.mjs` can touch all cohorts.

**D3 finding:** the migrations already run against production (photo import, awards-array split,
cohort-stats wiring) wrote **no rollback file**. There is no `audit/*-rollback.json` from any
prior run. Only future migrations (per the new rule) would.
