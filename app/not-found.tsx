export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 700, color: '#111827', margin: 0 }}>404</h1>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem' }}>Page not found</p>
          <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: '0.875rem', color: '#4f46e5', textDecoration: 'none' }}>Go home</a>
        </div>
      </body>
    </html>
  );
}
