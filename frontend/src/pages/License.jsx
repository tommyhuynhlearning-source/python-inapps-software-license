import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
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

const groupByService = (list) => {
  const map = {}
  for (const l of list) {
    const key = l.tenPhanMem || '(Chưa đặt tên)'
    if (!map[key]) map[key] = []
    map[key].push(l)
  }
  return Object.entries(map).map(([name, accounts]) => ({ name, accounts }))
}

const FilterBar = ({ teams, active, onTeam, search, onSearch, count, onAdd }) => (
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
      placeholder="Tìm dịch vụ..."
      style={{
        marginLeft: 8, border: 'none', outline: 'none', fontSize: 13,
        color: '#374151', background: 'transparent', width: 180,
      }}
    />
    <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>{count} dịch vụ</span>
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
  chiPhiHangThang: '', loaiChiPhi: '', loaiTaiKhoan: '', nguoiQuanLy: '', ngayHetHan: '', emailDangKy: '',
}

const toFormValues = (acc) => ({
  tenPhanMem: acc.tenPhanMem || '',
  team: acc.team || '',
  soLuongLicense: acc.soLuongLicense != null ? String(acc.soLuongLicense) : '',
  chiPhiHangNam: acc.chiPhiHangNam != null ? String(acc.chiPhiHangNam) : '',
  chiPhiHangThang: acc.chiPhiHangThang != null ? String(acc.chiPhiHangThang) : '',
  loaiChiPhi: acc.loaiChiPhi || '',
  loaiTaiKhoan: acc.loaiTaiKhoan || '',
  nguoiQuanLy: acc.nguoiQuanLy || '',
  ngayHetHan: acc.ngayHetHan || '',
  emailDangKy: acc.emailDangKy || '',
})

export default function License() {
  const { getToken } = useAuth()
  const { licenses, setLicenses } = useData()
  const [teamFilter, setTeamFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // { id, ...fields }
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openAddToService = (serviceName, e) => {
    e.stopPropagation()
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, tenPhanMem: serviceName })
    setShowModal(true)
  }

  const openEdit = (acc, e) => {
    e.stopPropagation()
    setEditTarget(acc)
    setForm(toFormValues(acc))
    setShowModal(true)
  }

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
      if (editTarget) {
        const res = await fetch(`/api/licenses/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const updated = await res.json()
        setLicenses(prev => prev.map(l => l.id === updated.id ? updated : l))
      } else {
        const res = await fetch('/api/licenses/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const created = await res.json()
        setLicenses(prev => [...prev, created])
      }
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditTarget(null)
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (acc, e) => {
    e.stopPropagation()
    if (!confirm(`Xóa tài khoản "${acc.tenPhanMem}" (${acc.loaiTaiKhoan || acc.team || ''})? Không thể hoàn tác.`)) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/licenses/${acc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setLicenses(prev => prev.filter(l => l.id !== acc.id))
      setSelected(prev => { const s = new Set(prev); s.delete(acc.id); return s })
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Xóa ${selected.size} tài khoản đã chọn? Không thể hoàn tác.`)) return
    try {
      const token = await getToken()
      await Promise.all([...selected].map(id => fetch(`/api/licenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })))
      setLicenses(prev => prev.filter(l => !selected.has(l.id)))
      setSelected(new Set())
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const totalServices = useMemo(() => groupByService(licenses).length, [licenses])
  const totalAccounts = licenses.length
  const expiringSoon = useMemo(() => licenses.filter(l => isExpiringSoon(l.ngayHetHan)).length, [licenses])
  const filtered = useMemo(() => licenses.filter(l => {
    if (teamFilter !== 'Tất cả' && l.team !== teamFilter) return false
    if (search && !l.tenPhanMem?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [licenses, teamFilter, search])
  const services = useMemo(() => groupByService(filtered), [filtered])

  return (
    <div>
      <div style={{ display: 'flex', gap: 48, marginBottom: 32, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{totalServices}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Dịch vụ</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{totalAccounts}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Tài khoản</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{expiringSoon}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Sắp hết hạn</div>
        </div>
      </div>

      <FilterBar
        teams={TEAMS} active={teamFilter} onTeam={setTeamFilter}
        search={search} onSearch={setSearch} count={services.length}
        onAdd={openAdd}
      />
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#1f2937', color: '#fff', borderRadius: 10,
          padding: '10px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 1000,
        }}>
          <span style={{ fontSize: 13 }}>Đã chọn <strong>{selected.size}</strong> tài khoản</span>
          <button onClick={handleBulkDelete} style={{
            background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6,
            padding: '5px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>Xóa đã chọn</button>
          <button onClick={() => setSelected(new Set())} style={{
            background: 'none', border: '1px solid #4b5563', color: '#d1d5db',
            borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer',
          }}>Bỏ chọn</button>
        </div>
      )}

      {showModal && (
        <Modal title={editTarget ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'} onClose={() => { setShowModal(false); setEditTarget(null) }} onSubmit={handleSubmit} submitting={submitting}>
          <Field label="Tên dịch vụ *">
            <Input required value={form.tenPhanMem} onChange={e => setForm(f => ({ ...f, tenPhanMem: e.target.value }))} placeholder="VD: Claude Pro, Figma..." />
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
          <Field label="Loại tài khoản">
            <Input value={form.loaiTaiKhoan} onChange={e => setForm(f => ({ ...f, loaiTaiKhoan: e.target.value }))} placeholder="VD: Pro, Business, Enterprise..." />
          </Field>
          <Field label="Số lượng license">
            <Input type="number" min="0" value={form.soLuongLicense} onChange={e => setForm(f => ({ ...f, soLuongLicense: e.target.value }))} placeholder="0" />
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
          <Field label="Email đăng ký">
            <Input type="email" value={form.emailDangKy} onChange={e => setForm(f => ({ ...f, emailDangKy: e.target.value }))} placeholder="email@example.com" />
          </Field>
        </Modal>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
        {services.length === 0 ? (
          <div style={{ padding: '32px 0', color: '#9ca3af', textAlign: 'center' }}>Không có dữ liệu.</div>
        ) : services.map(({ name, accounts }) => {
          const isOpen = expanded === name
          const totalYear = accounts.reduce((s, a) => s + (a.chiPhiHangNam || 0), 0)
          const anyExpiring = accounts.some(a => isExpiringSoon(a.ngayHetHan))

          return (
            <div key={name} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : name)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer' }}
              >
                <InitialAvatar name={name} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>{name}</span>
                {anyExpiring && (
                  <span style={{ fontSize: 11, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '1px 8px' }}>
                    Sắp hết hạn
                  </span>
                )}
                <span style={{ fontSize: 13, color: '#9ca3af' }}>
                  {accounts.length} tài khoản
                </span>
                {totalYear > 0 && (
                  <span style={{ fontSize: 13, color: '#374151', minWidth: 110, textAlign: 'right' }}>
                    ${Number(totalYear).toLocaleString()}/năm
                  </span>
                )}
                <button onClick={e => openAddToService(name, e)} title="Thêm tài khoản vào dịch vụ này" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>+</button>
                <Chevron open={isOpen} />
              </div>

              {isOpen && (
                <div style={{ background: '#fafafa', borderTop: '1px solid #f3f4f6', paddingBottom: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 12px 6px', width: 32 }}>
                          <input type="checkbox"
                            checked={accounts.every(a => selected.has(a.id))}
                            onChange={e => { e.stopPropagation(); setSelected(prev => { const s = new Set(prev); accounts.forEach(a => e.target.checked ? s.add(a.id) : s.delete(a.id)); return s }) }}
                          />
                        </th>
                        <th style={{ padding: '8px 8px 6px', textAlign: 'left', fontWeight: 500, color: '#9ca3af' }}>Team</th>
                        <th style={{ padding: '8px 12px 6px', textAlign: 'left', fontWeight: 500, color: '#9ca3af' }}>Loại tài khoản</th>
                        <th style={{ padding: '8px 12px 6px', textAlign: 'left', fontWeight: 500, color: '#9ca3af' }}>Người quản lý</th>
                        <th style={{ padding: '8px 12px 6px', textAlign: 'left', fontWeight: 500, color: '#9ca3af' }}>Email đăng ký</th>
                        <th style={{ padding: '8px 12px 6px', textAlign: 'left', fontWeight: 500, color: '#9ca3af' }}>Chi phí</th>
                        <th style={{ padding: '8px 12px 6px', textAlign: 'left', fontWeight: 500, color: '#9ca3af' }}>Hết hạn</th>
                        <th style={{ padding: '8px 12px 6px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map(acc => (
                        <tr key={acc.id} style={{ borderTop: '1px solid #f3f4f6', background: selected.has(acc.id) ? '#f5f3ff' : 'transparent' }}>
                          <td style={{ padding: '9px 12px' }}>
                            <input type="checkbox" checked={selected.has(acc.id)} onChange={e => toggleSelect(acc.id, e)} />
                          </td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>{acc.team || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>{acc.loaiTaiKhoan || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>{acc.nguoiQuanLy || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>{acc.emailDangKy || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>
                            {acc.chiPhiHangNam
                              ? `$${Number(acc.chiPhiHangNam).toLocaleString()}/năm`
                              : acc.chiPhiHangThang
                                ? `$${Number(acc.chiPhiHangThang).toLocaleString()}/tháng`
                                : '—'}
                          </td>
                          <td style={{ padding: '9px 12px', color: isExpiringSoon(acc.ngayHetHan) ? '#f59e0b' : '#374151', fontWeight: isExpiringSoon(acc.ngayHetHan) ? 500 : 400 }}>
                            {acc.ngayHetHan || '—'}
                          </td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={e => openEdit(acc, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '2px 6px' }}>Sửa</button>
                            <button onClick={e => handleDelete(acc, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '2px 6px' }}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
