# MESA FFP — Backend Audit (read-only)

Scope: secrets/auth/authz, data model & indexes, query layer & connections, scripts,
validation/logging/deps. Both cohorts live. **No writes were performed.** Findings carry
`file:line` or query output. Values redacted as `<REDACTED>`.

## Tooling limits (stated, not skipped)
- **0.1 Atlas backup snapshot — NOT taken.** No Atlas console access from this environment.
  Take one manually and record the snapshot ID before any Stage-1/2 write pass.
- **0.3 Vercel project ownership — NOT verifiable.** No Vercel access. Git remote is
  `github.com/svayantra-tech/mesa_ffp_2026` (that is where the running site's commits are
  pushed). Confirm in Vercel which project serves `ffp.mesaschool.me` and that
  `svayantra-tech/mesa_ffp_2026` vs `mesa-ffp/mesa-ffp-2026` are not diverged. **Do not deploy
  until confirmed.**
- **A5 GCS bucket ACL** — can't inspect the bucket from the repo (uploads go through an external
  API, not a bucket credential here). Reasoned below; the live ACL needs a GCP console check.
- **No browser** — nothing visual in this report.

## 0.2 Repo visibility — **PUBLIC**
`GET api.github.com/repos/svayantra-tech/mesa_ffp_2026 → "private": false, "visibility":
"public"`. Every secret-exposure finding is judged against a public repo.

---

## Headline
**No P0 was found.** No secret is committed (source or history), the admin session is
HMAC-signed and not forgeable, there is no unauthenticated write path, no mass-assignment
vector, and **zero cross-cohort data leakage** (referential integrity is clean in both
cohorts). The real launch risks are **P1 operational**: a stale unique index silently blocking
cohort-2 content, no login rate-limit, zero caching under force-dynamic, and no observability.

---

## P1 — fix before / around launch

### F01 · Stale `key_1` unique index on `program_media` — **BUG, exploitable today**
`audit/indexes.txt`: `program_media` carries **both** `cohort_1_key_1` (unique, intended) **and**
`key_1` (unique, the old index the migration was supposed to drop). `key_1` makes media keys
**globally** unique, so cohort-2 **cannot** store `landing_hero_image`, `landing_demo_day`,
`landing_top_performers`, etc. while cohort-1 holds them — the admin landing save throws
`E11000 duplicate key`. This is **why cohort-2's landing is empty** — it is not merely "admin
hasn't uploaded"; it is *blocked*. Fix: `db.program_media.dropIndex('key_1')` (leaves the
compound). **Do not apply — recommend.** Verify no code relies on global-key uniqueness (none
does; all reads are `{cohort, key}`).

### F02 · No rate-limit / lockout on admin login — **RISK, exploitable today**
`app/api/admin/login/route.ts` compares env credentials and has no throttle; `proxy.ts:31` lets
`/api/admin/login` through unauthenticated. Password is a single env value brute-forceable at
Vercel's request rate. Recommend an IP/session attempt counter (or Vercel WAF rule). Public repo
does **not** expose the password (it's env-only), so this is guessing, not reading.

### F03 · Zero caching under `force-dynamic` — **RISK, bites under launch traffic**
Every cohort route is `dynamic='force-dynamic'` + `revalidate=0`, no `unstable_cache`. Every
page view hits Atlas (~10 indexed queries per landing render — see F20/C2). Connection pooling
is fine (F-C1), but query **volume** scales 1:1 with traffic. This was a deliberate anti-stale
choice — **do not silently re-enable caching.** Recommendation only: on-demand revalidation via
`revalidateTag`/`revalidatePath` fired from the admin write paths (`revalidatePublic` already
exists in queries.ts:466 and is called by every mutation route) would let you cache reads and
still invalidate on edit. That is the correct long-term shape; decide deliberately.

### F04 · No observability — **GAP**
No Sentry, no structured logging. If a student page 500s in production, the only signal is Vercel
runtime logs. Recommend an error reporter before launch day.

### F05 · Globally-unique `slug` on Student and Brand — **BUG, latent**
`Student.ts:7`, `Brand.ts:6`: `slug: { unique: true }` is **global**, not per-cohort. A cohort-3
student who shares a name (hence slug) with a cohort-1 student **cannot be inserted**
(`E11000`). It hasn't bitten (0 cross-cohort slug collisions today) *because the cohort-2 import
worked around it by appending `-2/-3` against the global set* — some cohort-2 `-2` suffixes exist
only to dodge a cohort-1 name, not an intra-cohort clash. Recommend compound `{cohort, slug}`
unique (mirrors what `program_media` already intends). **Do not apply.**

---

## P2 — design weaknesses / hygiene

- **F06 · Dangerous default (`cohort-visibility.ts:12`)** — `getCohortEnabled` returns `true`
  when the flag doc is absent. Blast radius: a freshly-seeded cohort-3 is **publicly live the
  instant its data lands**, before anyone toggles it. Recommend defaulting new cohorts to hidden.
- **F07 · Auth enforced only in middleware** — `/api/admin/*` handlers trust `proxy.ts:30-35`
  and don't re-verify the session. Not exploitable today (middleware runs), but a matcher edit or
  a route moved outside `/api/admin` would silently unauthenticate it. Defense-in-depth gap.
- **F08 · Schema rot** — `Brand.flea_photos`, `demo_photos`, `product_photo` are serialized
  (`queries.ts:99-103`) but have **no write path** (`createBrand`/`updateBrand` omit them) and
  **no render**. Also confirmed: `Student.award_photo` was fully removed (moved to Brand). ✓
- **F09 · Parallel arrays desync** — `awards[]` / `award_descriptions[]` are index-aligned by
  convention only. `updateBrand` (queries.ts:431-437) sets each independently, so an edit can
  leave them different lengths. Recommend `awards: [{title, description}]`.
- **F10 · Video provider by length heuristic** — `MarketingAssets.tsx:33-38`: 11-char ⇒ YouTube,
  else `length>15` ⇒ Drive. No `provider` field. Fragile, and about to matter for the cohort-2 →
  YouTube migration. Recommend storing full URLs or a provider discriminator.
- **F11 · Scripts write with no DRY_RUN** — see `audit/scripts-inventory.md`. Only
  `import-c2-photos.ts` defaults to dry-run; every other write-script mutates prod on
  `npx tsx scripts/<x>.ts` with no confirmation. `audit.ts` **writes despite its name**.
- **F12 · No rollback files** — the already-run prod migrations (photo import, awards split,
  cohort stats) wrote none. (D3)
- **F13 · No input-validation library** — no zod/valibot; relies on Mongoose casting + ad-hoc
  `if (!slug || !name)`. Admin-only surface, so low urgency, but bodies are unvalidated.
- **F14 · Dead Supabase client** — `lib/supabase/*` is wired but **unused in `app/`** (grep:
  0 references). `NEXT_PUBLIC_SUPABASE_*` would ship in the client bundle *if* imported; it isn't.
  Recommend removing the client and the anon key. (E4)
- **F15 · `NEXT_PUBLIC_SITE_URL` read but unset** — `app/layout.tsx` metadataBase depends on it;
  unset in Vercel ⇒ og tags fall back to the per-deploy host. Set it (Production + Preview). (E6)

## P3 — minor
- **F16/F18** preview token & admin password compared with `===` not `timingSafeEqual`
  (192-bit token / env password ⇒ impractical timing attack).
- **F17** preview token travels in `?preview=` ⇒ captured in platform access logs, browser
  history, referrer. Inherent to URL-token previews; rotate after sharing.
- **F19** admin catch blocks return `err.message` to the (authenticated) admin.
- **F20** `[slug]` fetches the student twice — `generateMetadata` + the page component.

---

## Hypotheses in the prompt that are WRONG (with evidence)
- **"Unauthenticated upload endpoint"** — FALSE. `/api/admin/upload` is gated by `proxy.ts:30-35`
  (session required) and does server-side magic-byte sniffing (`upload/route.ts:10-49`).
- **"Mass assignment — can a caller set cohort/_id/slug?"** — NO. `updateStudent`/`updateBrand`
  whitelist fields (`queries.ts:379-386`, `424-441`) and scope filters to `{_id, cohort}`.
- **"Every request opens a new Atlas connection"** — FALSE. `mongodb.ts:23-45` caches on
  `global.mongoose` and reuses it (`bufferCommands:false`).
- **"Landing issues 30+ finds (N+1)"** — FALSE. ~10 indexed queries; `populate` is batched (`$in`),
  not per-row. No COLLSCAN anywhere (`audit/explain.txt`).
- **"RefleKt/KAZI etc."** — belongs to the data pass; here: **no `award_photo` is shared across
  any two brands** (verified) and referential integrity is clean.
- **A1 secrets** — none in source or history: `mongodb+srv` appears in 0 commits;
  `.env*` is gitignored and never tracked; the only `ADMIN_PASSWORD=`/`SERVICE_ROLE` hits are the
  empty `.env.example` template and `process.env.*` references.

## Referential integrity (B7) — clean
cohort-1 (113 students / 29 brands) and cohort-2 (112 / 30): **0** null brand_id, **0** dangling
brand_id, **0** cross-cohort brand refs, **0** empty brands, **0** duplicate slugs, **0** empty
slugs. ProgramMedia parity: cohort-1 has 21 landing/media keys; cohort-2 has **none** of them
(only `cohort_enabled_*`, `preview_token_*`) — consistent with F01 blocking them.

## C3 — truncation locus (for the frontend pass, not fixed here)
DB holds 4 videos / 3 statics per non-Pink-Pankti brand. Truncation is in the **components**:
`app/[cohort]/[slug]/page.tsx:75` `.slice(0,3)` and `:76` `.slice(0,2)`; also
`MarketingAssets.tsx:133` `.slice(0,3)` and `:139` `.slice(0,5)`. Not in the query layer.

## C5 — transactions
No multi-document atomic writes exist. The one risky reassignment (student `brand_id`) is a
single-document update — atomic on its own. `upsertProgramMedia` loops independent `updateOne`s
(no cross-doc invariant). No transaction needed today.
