import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Device() {
  const { getToken } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getToken()
      .then(token => fetch('/api/devices/', { headers: { Authorization: `Bearer ${token}` } }))
      .then(r => {
        if (r.status === 403) throw new Error('Bạn không có quyền truy cập.')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setDevices(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h2>Devices</h2>
      {devices.length === 0 ? (
        <p>No devices registered.</p>
      ) : (
        <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th align="left">Name</th>
              <th align="left">Hardware ID</th>
              <th align="left">License ID</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{d.name}</td>
                <td>{d.hardware_id}</td>
                <td>{d.license_id}</td>
                <td>{d.active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
