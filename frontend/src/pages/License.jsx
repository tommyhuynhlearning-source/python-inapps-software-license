import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function License() {
  const { getToken } = useAuth()
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getToken()
      .then(token => fetch('/api/licenses/', { headers: { Authorization: `Bearer ${token}` } }))
      .then(r => {
        if (r.status === 403) throw new Error('Bạn không có quyền truy cập.')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setLicenses(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

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
