'use client'

// ULTRA-MINIMAL STATIC VERSION - NO JAVASCRIPT
// Just proves the component loads without hanging
export function SiteAnalyzer() {
  // NO console.error - could cause issues
  // NO useState - could cause re-renders
  // NO handlers - just static HTML

  return (
    <div
      style={{
        border: '20px solid red',
        padding: '100px',
        background: 'yellow',
        textAlign: 'center'
      }}
    >
      <h1 style={{ fontSize: '60px', color: 'red' }}>
        STATIC TEST
      </h1>
      <p style={{ fontSize: '30px', color: 'blue' }}>
        If you see this yellow box, component loaded
      </p>
      <div style={{
        marginTop: '50px',
        padding: '30px',
        background: 'white',
        border: '5px solid black'
      }}>
        <p style={{ fontSize: '24px', color: 'green' }}>
          This is a static div - no JavaScript at all
        </p>
      </div>
    </div>
  )
}

export default SiteAnalyzer