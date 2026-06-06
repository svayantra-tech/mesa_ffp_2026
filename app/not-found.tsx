import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FDF8F0',
      fontFamily: "'Manrope', sans-serif",
      textAlign: 'center',
      padding: '40px 20px',
    }}>
      <img
        src="/assets/mesa-logo.png"
        alt="Mesa School of Business"
        style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '32px' }}
      />
      <h1 style={{
        fontSize: '48px',
        fontWeight: 800,
        color: '#0F1919',
        margin: '0 0 12px',
        letterSpacing: '-0.02em',
      }}>
        404
      </h1>
      <p style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#0F1919',
        margin: '0 0 8px',
      }}>
        Page not found
      </p>
      <p style={{
        fontSize: '14px',
        color: 'rgba(15,25,25,0.55)',
        margin: '0 0 36px',
        maxWidth: '360px',
        lineHeight: 1.6,
      }}>
        This portfolio doesn&apos;t exist or hasn&apos;t been published yet.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 28px',
            background: '#BA3B41',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '.02em',
          }}
        >
          Back to Home
        </Link>
        <Link
          href="/directory"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 28px',
            background: 'transparent',
            color: '#0F1919',
            border: '1.5px solid rgba(15,25,25,0.15)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '.02em',
          }}
        >
          Browse Directory
        </Link>
      </div>
    </div>
  )
}
