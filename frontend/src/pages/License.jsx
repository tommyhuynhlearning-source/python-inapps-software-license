import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal, { Field, Input, Select } from '../components/Modal'

const TEAMS = ['BD', 'Dev', 'Marketing', 'HR']

const Chevron = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const InitialAvatar = ({ name }) => (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: '#f3f4f6', color: '#6b7280',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 600, flexShrink: 0,
  }}>
    {name ? name[0].toUpperCase() : '?'}
  </div>
)

const isExpiringSoon = (dateStr) => {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d)) return false
  const diff = d - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

const FilterBar = ({ teams, active, onTeam, search, onSearch, count, placeholder, onAdd }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4, flexWrap: 'wrap' }}>
    {['Tất cả', ...teams].map(t => (
      <button key={t} onClick={() => onTeam(t)} style={{
        padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: active === t ? 500 : 400,
        background: active === t ? '#000' : 'transparent',
        color: active === t ? '#fff' : '#374151',
      }}>{t}</button>
    ))}
    <input
      value={search} onChange={e => onSearch(e.target.value)}
      placeholder={placeholder}
      style={{
        marginLeft: 8, border: 'none', outline: 'none', fontSize: 13,
        color: '#374151', background: 'transparent', width: 180,
      }}
    />
    <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>{count} records</span>
    <button onClick={onAdd} style={{
      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#4f46e5', fontSize: 13, fontWeight: 500,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Thêm mới
    </button>
  </div>
)

const EMPTY_FORM = {
  tenPhanMem: '', team: '', soLuongLicense: '', chiPhiHangNam: '',
  chiPhiHangThang: '', loaiChiPhi: '', loaiTaiKhoan: '', nguoiQuanLy: '', ngayHetHan: '',
}

export default function License() {
  const { getToken } = useAuth()
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamFilter, setTeamFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const token = await getToken()
      const body = {
        ...form,
        soLuongLicense: form.soLuongLicense ? Number(form.soLuongLicense) : null,
        chiPhiHangNam: form.chiPhiHangNam ? Number(form.chiPhiHangNam) : null,
        chiPhiHangThang: form.chiPhiHangThang ? Number(form.chiPhiHangThang) : null,
      }
      const res = await fetch('/api/licenses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const created = await res.json()
      setLicenses(prev => [...prev, created])
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ color: '#9ca3af', padding: '40px 0' }}>Loading...</div>
  if (error) return <div style={{ color: '#ef4444', padding: '16px' }}>{error}</div>

  const expiringSoon = licenses.filter(l => isExpiringSoon(l.ngayHetHan)).length

  const filtered = licenses.filter(l => {
    if (teamFilter !== 'Tất cả' && l.team !== teamFilter) return false
    if (search && !l.tenPhanMem?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 48, marginBottom: 32, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{licenses.length}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Phần mềm</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{expiringSoon}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Sắp hết hạn</div>
        </div>
      </div>

      <FilterBar
        teams={TEAMS} active={teamFilter} onTeam={setTeamFilter}
        search={search} onSearch={setSearch} count={filtered.length}
        placeholder="Tìm phần mềm..." onAdd={() => setShowModal(true)}
      />

      {showModal && (
        <Modal title="Thêm phần mềm mới" onClose={() => setShowModal(false)} onSubmit={handleSubmit} submitting={submitting}>
          <Field label="Tên phần mềm *">
            <Input required value={form.tenPhanMem} onChange={e => setForm(f => ({ ...f, tenPhanMem: e.target.value }))} placeholder="VD: Figma" />
          </Field>
          <Field label="Team">
            <Select value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}>
              <option value="">-- Chọn team --</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Người quản lý">
            <Input value={form.nguoiQuanLy} onChange={e => setForm(f => ({ ...f, nguoiQuanLy: e.target.value }))} placeholder="Tên người quản lý" />
          </Field>
          <Field label="Số lượng license">
            <Input type="number" min="0" value={form.soLuongLicense} onChange={e => setForm(f => ({ ...f, soLuongLicense: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Loại tài khoản">
            <Input value={form.loaiTaiKhoan} onChange={e => setForm(f => ({ ...f, loaiTaiKhoan: e.target.value }))} placeholder="VD: Business, Enterprise..." />
          </Field>
          <Field label="Loại chi phí">
            <Input value={form.loaiChiPhi} onChange={e => setForm(f => ({ ...f, loaiChiPhi: e.target.value }))} placeholder="VD: Hàng năm, Hàng tháng..." />
          </Field>
          <Field label="Chi phí hàng năm ($)">
            <Input type="number" min="0" value={form.chiPhiHangNam} onChange={e => setForm(f => ({ ...f, chiPhiHangNam: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Chi phí hàng tháng ($)">
            <Input type="number" min="0" value={form.chiPhiHangThang} onChange={e => setForm(f => ({ ...f, chiPhiHangThang: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Ngày hết hạn">
            <Input type="date" value={form.ngayHetHan} onChange={e => setForm(f => ({ ...f, ngayHetHan: e.target.value }))} />
          </Field>
        </Modal>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#9ca3af', textAlign: 'center' }}>Không có dữ liệu.</div>
        ) : filtered.map(l => (
          <div key={l.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div
              onClick={() => setExpanded(expanded === l.id ? null : l.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer' }}
            >
              <InitialAvatar name={l.tenPhanMem} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>
                {l.tenPhanMem || '—'}
              </span>
              <span style={{ fontSize: 14, color: '#6b7280', minWidth: 24, textAlign: 'right' }}>
                {l.soLuongLicense || ''}
              </span>
              <span style={{ fontSize: 14, color: '#374151', minWidth: 100, textAlign: 'right' }}>
                {l.chiPhiHangNam ? `$${Number(l.chiPhiHangNam).toLocaleString()}/năm` : ''}
              </span>
              <Chevron open={expanded === l.id} />
            </div>
            {expanded === l.id && (
              <div style={{
                padding: '12px 44px 16px',
                background: '#fafafa',
                fontSize: 13, color: '#374151',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 24px',
                borderTop: '1px solid #f3f4f6',
              }}>
                <div><span style={{ color: '#9ca3af' }}>Team: </span>{l.team || '—'}</div>
                <div><span style={{ color: '#9ca3af' }}>Người quản lý: </span>{l.nguoiQuanLy || '—'}</div>
                <div><span style={{ color: '#9ca3af' }}>Loại tài khoản: </span>{l.loaiTaiKhoan || '—'}</div>
                <div><span style={{ color: '#9ca3af' }}>Loại chi phí: </span>{l.loaiChiPhi || '—'}</div>
                <div><span style={{ color: '#9ca3af' }}>Chi phí/tháng: </span>{l.chiPhiHangThang || '—'}</div>
                <div><span style={{ color: '#9ca3af' }}>Hết hạn: </span>{l.ngayHetHan || '—'}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
