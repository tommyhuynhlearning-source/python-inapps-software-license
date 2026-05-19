import { useEffect, useState } from 'react'

export default function License() {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/licenses/')
      .then(r => r.json())
      .then(data => setLicenses(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h2>Licenses</h2>
      {licenses.length === 0 ? (
        <p>No licenses found.</p>
      ) : (
        <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th align="left">Key</th>
              <th align="left">Product</th>
              <th align="left">Owner</th>
              <th align="left">Expires</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{l.key}</td>
                <td>{l.product}</td>
                <td>{l.owner}</td>
                <td>{l.expires_at ?? '—'}</td>
                <td>{l.active ? 'Active' : 'Revoked'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
