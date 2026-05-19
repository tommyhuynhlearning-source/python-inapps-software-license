import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const fmt = (v) => (v == null || v === '' ? '—' : v)
const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('vi-VN') : '—'

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
        <p>Không có dữ liệu.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th align="left">Thiết bị</th>
                <th align="left">Loại máy</th>
                <th align="left">Nhân sự dùng</th>
                <th align="left">Team</th>
                <th align="left">Ghi chú</th>
                <th align="left">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{fmt(d.tenThietBi)}</td>
                  <td>{fmt(d.loaiMay)}</td>
                  <td>{fmt(d.nhanSuSuDung)}</td>
                  <td>{fmt(d.team)}</td>
                  <td>{fmt(d.ghiChu)}</td>
                  <td>{fmtDate(d.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
