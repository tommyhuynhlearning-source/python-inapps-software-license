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

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#9ca3af' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const EMPTY_FORM = { tenService: '', email: '', loaiCredential: '', vaiTro: '', nguoiNamGiu: '', team: '' }

const toFormValues = (r) => ({
  tenService: r.tenService || '',
  email: r.email || '',
  loaiCredential: r.loaiCredential || '',
  vaiTro: r.vaiTro || '',
  nguoiNamGiu: r.nguoiNamGiu || '',
  team: r.team || '',
})

export default function Security() {
  const { getToken } = useAuth()
  const { records, setRecords } = useData()
  const [teamFilter, setTeamFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (r, e) => { e.stopPropagation(); setEditTarget(r); setForm(toFormValues(r)); setShowModal(true) }
  const openAddToService = (serviceName, e) => {
    e.stopPropagation()
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, tenService: serviceName })
    setShowModal(true)
  }
  const handleDeleteService = async (serviceName, items, e) => {
    e.stopPropagation()
    if (!confirm(`Xóa toàn bộ service "${serviceName}" (${items.length} credential)? Không thể hoàn tác.`)) return
    try {
      const token = await getToken()
      await Promise.all(items.map(r => fetch(`/api/security/events/${r.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })))
      setRecords(prev => prev.filter(r => r.tenService !== serviceName))
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const token = await getToken()
      if (editTarget) {
        const res = await fetch(`/api/security/events/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const updated = await res.json()
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
      } else {
        const res = await fetch('/api/security/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const created = await res.json()
        setRecords(prev => [created, ...prev])
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

  const handleDelete = async (r, e) => {
    e.stopPropagation()
    if (!confirm(`Xóa credential "${r.email || r.loaiCredential || r.tenService}"? Không thể hoàn tác.`)) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/security/events/${r.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRecords(prev => prev.filter(x => x.id !== r.id))
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const uniqueServices = useMemo(() => new Set(records.map(r => r.tenService).filter(Boolean)).size, [records])
  const uniqueOwners = useMemo(() => new Set(records.map(r => r.nguoiNamGiu).filter(Boolean)).size, [records])

  const filtered = useMemo(() => records.filter(r => {
    if (teamFilter !== 'Tất cả' && r.team !== teamFilter) return false
    if (search && !r.tenService?.toLowerCase().includes(search.toLowerCase()) &&
        !r.nguoiNamGiu?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [records, teamFilter, search])

  const groups = useMemo(() => filtered.reduce((acc, r) => {
    const k = r.tenService || 'Khác'
    if (!acc[k]) acc[k] = []
    acc[k].push(r)
    return acc
  }, {}), [filtered])

  return (
    <div>
      <div style={{ display: 'flex', gap: 48, marginBottom: 32, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{uniqueServices}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Services</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{records.length}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Credentials</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px', color: '#ef4444' }}>
            {uniqueOwners}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Owners</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4, flexWrap: 'wrap' }}>
        {['Tất cả', ...TEAMS].map(t => (
          <button key={t} onClick={() => setTeamFilter(t)} style={{
            padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: teamFilter === t ? 500 : 400,
            background: teamFilter === t ? '#000' : 'transparent',
            color: teamFilter === t ? '#fff' : '#374151',
          }}>{t}</button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm service hoặc người dùng..."
          style={{
            marginLeft: 8, border: 'none', outline: 'none', fontSize: 13,
            color: '#374151', background: 'transparent', width: 200,
          }}
        />
        <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>{filtered.length} records</span>
        <button onClick={openAdd} style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#4f46e5', fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Thêm mới
        </button>
      </div>

      {showModal && (
        <Modal title={editTarget ? 'Chỉnh sửa credential' : 'Thêm credential mới'} onClose={() => { setShowModal(false); setEditTarget(null) }} onSubmit={handleSubmit} submitting={submitting}>
          <Field label="Tên service *">
            <Input required value={form.tenService} onChange={e => setForm(f => ({ ...f, tenService: e.target.value }))} placeholder="VD: AWS, GitHub..." />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
          </Field>
          <Field label="Loại credential">
            <Input value={form.loaiCredential} onChange={e => setForm(f => ({ ...f, loaiCredential: e.target.value }))} placeholder="VD: API Key, OAuth..." />
          </Field>
          <Field label="Vai trò">
            <Input value={form.vaiTro} onChange={e => setForm(f => ({ ...f, vaiTro: e.target.value }))} placeholder="VD: Admin, Developer..." />
          </Field>
          <Field label="Người nắm giữ">
            <Input value={form.nguoiNamGiu} onChange={e => setForm(f => ({ ...f, nguoiNamGiu: e.target.value }))} placeholder="Tên người nắm giữ" />
          </Field>
          <Field label="Team">
            <Select value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}>
              <option value="">-- Chọn team --</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </Modal>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
        {Object.entries(groups).length === 0 ? (
          <div style={{ padding: '32px 0', color: '#9ca3af', textAlign: 'center' }}>Không có dữ liệu.</div>
        ) : Object.entries(groups).map(([service, items]) => {
          const owners = new Set(items.map(r => r.nguoiNamGiu).filter(Boolean)).size
          return (
            <div key={service} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div
                onClick={() => setExpanded(expanded === service ? null : service)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer' }}
              >
                <ShieldIcon />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>{service}</span>
                <span style={{ fontSize: 14, color: '#374151', marginRight: 8 }}>{items.length}</span>
                {owners > 0 && (
                  <span style={{ fontSize: 13, color: owners > 1 ? '#ef4444' : '#6b7280', marginRight: 4 }}>
                    {owners} Owner
                  </span>
                )}
                <button onClick={e => openAddToService(service, e)} title="Thêm credential vào service này" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>+</button>
                <button onClick={e => handleDeleteService(service, items, e)} title="Xóa toàn bộ service" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '2px 4px' }}>Xóa</button>
                <Chevron open={expanded === service} />
              </div>
              {expanded === service && (
                <div style={{ paddingBottom: 8 }}>
                  {items.map(r => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '8px 28px', borderRadius: 6, marginBottom: 2,
                      background: '#fafafa', fontSize: 13, color: '#374151',
                    }}>
                      <span style={{ flex: 1 }}>{r.email || r.loaiCredential || '—'}</span>
                      <span style={{ color: '#6b7280', minWidth: 100 }}>{r.vaiTro || '—'}</span>
                      <span style={{ color: '#9ca3af' }}>{r.nguoiNamGiu || '—'}</span>
                      <button onClick={e => openEdit(r, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '2px 6px' }}>Sửa</button>
                      <button onClick={e => handleDelete(r, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '2px 6px' }}>Xóa</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
