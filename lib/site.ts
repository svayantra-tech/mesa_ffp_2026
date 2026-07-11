// Canonical public site URL — driven by env, never a literal TLD in components.
// Set NEXT_PUBLIC_SITE_URL in Vercel (Production + Preview). Falls back to the
// production domain so footers/share links never render the wrong host.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ffp.mesaschool.me').replace(/\/+$/, '')

/** Bare host for footer display, e.g. "ffp.mesaschool.me". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//i, '')
