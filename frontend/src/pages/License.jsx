import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const fmt = (v) => (v == null || v === '' ? '—' : v)
const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('vi-VN') : '—'

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
        <p>Không có dữ liệu.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th align="left">Phần mềm</th>
                <th align="left">Team</th>
                <th align="left">Người quản lý</th>
                <th align="left">Loại TK</th>
                <th align="left">Loại chi phí</th>
                <th align="left">Chi phí/tháng</th>
                <th align="left">Chi phí/năm</th>
                <th align="left">Hết hạn</th>
                <th align="left">SL</th>
                <th align="left">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{fmt(l.tenPhanMem)}</td>
                  <td>{fmt(l.team)}</td>
                  <td>{fmt(l.nguoiQuanLy)}</td>
                  <td>{fmt(l.loaiTaiKhoan)}</td>
                  <td>{fmt(l.loaiChiPhi)}</td>
                  <td>{fmt(l.chiPhiHangThang)}</td>
                  <td>{fmt(l.chiPhiHangNam)}</td>
                  <td>{fmt(l.ngayHetHan)}</td>
                  <td>{fmt(l.soLuongLicense)}</td>
                  <td>{fmtDate(l.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
