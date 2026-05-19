import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const fmt = (v) => (v == null || v === '' ? '—' : v)

export default function Security() {
  const { getToken } = useAuth()
  const [records, setRecords] = useState([])
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
      .then(data => setRecords(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h2>Security</h2>
      {records.length === 0 ? (
        <p>Không có dữ liệu.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th align="left">Service</th>
                <th align="left">Email</th>
                <th align="left">Loại credential</th>
                <th align="left">Vai trò</th>
                <th align="left">Người nắm giữ</th>
                <th align="left">Team</th>
                <th align="left">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{fmt(r.tenService)}</td>
                  <td>{fmt(r.email)}</td>
                  <td>{fmt(r.loaiCredential)}</td>
                  <td>{fmt(r.vaiTro)}</td>
                  <td>{fmt(r.nguoiNamGiu)}</td>
                  <td>{fmt(r.team)}</td>
                  <td>{fmt(r.ghiChu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
