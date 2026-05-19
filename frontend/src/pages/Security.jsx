import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const SEVERITY_COLOR = { info: '#0070f3', warning: '#f5a623', critical: '#e00' }

export default function Security() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getToken()
      .then(token => fetch('/api/security/events', { headers: { Authorization: `Bearer ${token}` } }))
      .then(r => {
        if (r.status === 403) throw new Error('Bạn không có quyền truy cập.')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setEvents(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h2>Security Events</h2>
      {events.length === 0 ? (
        <p>No security events.</p>
      ) : (
        <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th align="left">Type</th>
              <th align="left">Description</th>
              <th align="left">Device</th>
              <th align="left">License</th>
              <th align="left">Severity</th>
              <th align="left">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{e.event_type}</td>
                <td>{e.description}</td>
                <td>{e.device_id}</td>
                <td>{e.license_id}</td>
                <td style={{ color: SEVERITY_COLOR[e.severity] ?? '#333', fontWeight: 600 }}>
                  {e.severity}
                </td>
                <td>{e.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
