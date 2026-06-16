// Stateless admin session: an HMAC-signed { u, exp } token stored in an
// httpOnly cookie. Uses Web Crypto so it runs in both the Edge middleware and
// Node route handlers.

export const ADMIN_COOKIE = 'admin_session'
export const ADMIN_BASE = '/admin-mesa-portfolio-6300'
// Short session — re-login after this many ms of session age.
export const SESSION_TTL_MS = 3 * 60 * 60 * 1000 // 3 hours

const enc = new TextEncoder()
const dec = new TextDecoder()

// Web Crypto wants an ArrayBuffer-backed source; normalize encoded bytes.
function toAB(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
}
function bytes(s: string): ArrayBuffer {
  return toAB(enc.encode(s))
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bytesFromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-insecure-secret'
  return crypto.subtle.importKey(
    'raw',
    bytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export type Session = { u: string; exp: number }

export async function signSession(username: string): Promise<string> {
  const payload: Session = { u: username, exp: Date.now() + SESSION_TTL_MS }
  const payloadB64 = b64urlFromBytes(enc.encode(JSON.stringify(payload)))
  const key = await hmacKey()
  const sig = await crypto.subtle.sign('HMAC', key, bytes(payloadB64))
  return `${payloadB64}.${b64urlFromBytes(new Uint8Array(sig))}`
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token || !token.includes('.')) return null
  const [payloadB64, sigB64] = token.split('.')
  try {
    const key = await hmacKey()
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      toAB(bytesFromB64url(sigB64)),
      bytes(payloadB64)
    )
    if (!ok) return null
    const payload = JSON.parse(dec.decode(bytesFromB64url(payloadB64))) as Session
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/** Validate username/password against env credentials. */
export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME
  const p = process.env.ADMIN_PASSWORD
  return !!u && !!p && username === u && password === p
}
