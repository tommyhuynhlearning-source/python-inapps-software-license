import { useEffect, useState } from 'react'

export default function Device() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/devices/')
      .then(r => r.json())
      .then(data => setDevices(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>

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
