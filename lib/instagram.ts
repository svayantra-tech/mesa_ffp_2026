/**
 * Instagram handle helpers — applied at DISPLAY time only (never mutate the DB).
 * Raw values in the DB can be full share URLs with query junk, e.g.
 *   "@kairo.blr?igsh=MWN2M3E2ZXN1ZGVjdQ%3D%3D&utm_source=qr"
 *   "https://www.instagram.com/kairo.blr/"
 * Pure + exported so they are unit-testable.
 */

/**
 * Normalize any Instagram value to a clean "@handle":
 *   - strip protocol + host (instagram.com / instagr.am, with or without www.)
 *   - strip everything from the first "?" or "#"
 *   - strip a leading "@" and any trailing "/"
 *   - re-prefix exactly one "@"
 * Returns '' for empty/whitespace input.
 */
export function sanitizeInstagramHandle(raw: string | null | undefined): string {
  if (!raw) return ''
  let s = raw.trim()
  if (!s) return ''
  s = s.replace(/^https?:\/\//i, '')          // protocol
  s = s.replace(/^www\./i, '')                 // www.
  s = s.replace(/^(?:instagram\.com|instagr\.am)\//i, '') // host + slash
  s = s.split(/[?#]/)[0]                        // query / fragment
  s = s.replace(/^@+/, '').replace(/\/+$/, '').trim() // leading @, trailing /
  return s ? `@${s}` : ''
}

/** The instagram.com URL for a raw/handle value (no trailing junk). '' if empty. */
export function instagramUrl(raw: string | null | undefined): string {
  const handle = sanitizeInstagramHandle(raw)
  return handle ? `https://instagram.com/${handle.slice(1)}` : ''
}

/**
 * Truncate a handle for display to `max` characters (inclusive of a trailing
 * ellipsis). The full handle should still be used for href/title.
 */
export function truncateInstagramLabel(handle: string, max = 24): string {
  if (handle.length <= max) return handle
  return `${handle.slice(0, max - 1)}…`
}

/**
 * Website display label — DISPLAY only, never mutates the DB. Raw values can be
 * full tracking URLs, e.g.
 *   "https://pinkpanktimesa.com/?utm_campaign=1st+Visit…" → "pinkpanktimesa.com"
 * Strips protocol + www., everything from the first "?"/"#", and a trailing "/".
 * A real path is kept ("acme.com/about/" → "acme.com/about"). '' for empty input.
 */
export function sanitizeWebsiteForDisplay(raw: string | null | undefined): string {
  if (!raw) return ''
  let s = raw.trim()
  if (!s) return ''
  s = s.replace(/^https?:\/\//i, '')          // protocol
  s = s.replace(/^www\./i, '')                 // www.
  s = s.split(/[?#]/)[0]                        // query / fragment
  s = s.replace(/\/+$/, '')                     // trailing slash(es)
  return s
}

/**
 * Website href — LINK target. Keeps the full URL (incl. query) so the link still
 * works; only ensures a protocol so it isn't treated as a relative path.
 * "acme.com/x" → "https://acme.com/x"; "http://acme.com" stays as-is. '' if empty.
 */
export function websiteHref(raw: string | null | undefined): string {
  if (!raw) return ''
  const s = raw.trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}
