# API surface — `app/api/**`

Auth model: **all `/api/admin/*` routes are gated in `proxy.ts:30-35`** (Edge middleware) —
it verifies the HMAC session (`verifySession`) and returns 401 before the handler runs,
except `/api/admin/login`. **The route handlers do NOT re-check the session** (single point
of enforcement = the middleware). `/api/cohort-switch` is **not** under `/api/admin` and is
unauthenticated (read-only).

| Route | Methods | Auth guard | Reads | Writes | Notes |
|---|---|---|---|---|---|
| `admin/login` | POST | none (by design) | env creds | sets session cookie | plaintext `===` compare; **no rate limit** (A2/P1) |
| `admin/logout` | POST | middleware | — | clears cookie | |
| `admin/students` | GET, POST | middleware | listStudents | createStudent | POST body **whitelisted** in createStudent (no mass-assign) |
| `admin/students/[id]` | GET, PUT, DELETE | middleware | getStudent | updateStudent / delete | PUT passes full body → `updateStudent` **whitelists** fields (queries.ts:379-386); filter `{_id,cohort}`-scoped |
| `admin/brands` | GET, POST | middleware | listBrands | createBrand | body whitelisted (queries.ts:400-414) |
| `admin/brands/[id]` | GET, PUT, DELETE | middleware | getBrand | updateBrand / delete | body whitelisted (queries.ts:424-441) |
| `admin/cohort-visibility` | POST | middleware | getCohortEnabled | setCohortEnabled | flips `cohort_enabled_{slug}` |
| `admin/landing` | POST | middleware | — | upsertProgramMedia | |
| `admin/drive-folder` | (see file) | middleware | — | — | |
| `admin/preview-token` | POST | middleware | getPreviewToken | resetPreviewToken | returns token to authed admin |
| `admin/upload` | POST | middleware | — | external asset API → GCS | **authenticated** (contra hypothesis); server-side magic-byte sniff, image-only |
| `cohort-switch` | GET | **none** | getStudentBySlug | — | read-only; validates cohort; returns a URL. Discloses slug existence (slugs are public anyway) |

**Mass assignment (A6): not present.** No route spreads an untrusted body into a Mongo
filter or `$set`. All updates whitelist fields and scope the filter to `{_id, cohort}`, so a
caller cannot change `cohort`, `_id`, or `slug` via the body, nor inject arbitrary fields.

**Error handling (A7):** every admin catch block returns `err.message` to the client
(students/brands/landing routes). For Mongoose errors this can leak field/index names
(e.g. `E11000 ... slug_1`) — but **only to an authenticated admin**. Low severity.
