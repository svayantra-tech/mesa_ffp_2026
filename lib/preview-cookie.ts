/**
 * Preview-cookie name helper. Kept in its own dependency-free module so the Edge
 * `proxy.ts` can import it without pulling in Mongoose (which lib/cohort-visibility
 * would, via connectDB/ProgramMedia).
 */
export function previewCookieName(slug: string) {
  return `ffp_preview_${slug}`
}
