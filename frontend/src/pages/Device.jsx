import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Modal, { Field, Input, Select } from '../components/Modal'
import BulkImportModal from '../components/BulkImportModal'

const DEVICE_COLUMNS = [
  { key: 'tenThietBi', label: 'Tên thiết bị', required: true, example: 'MacBook Pro 14' },
  { key: 'loaiMay', label: 'Loại máy', example: 'Laptop' },
  { key: 'nhanSuSuDung', label: 'Nhân sự sử dụng', example: 'Tommy' },
  { key: 'team', label: 'Team', example: 'Dev' },
]

const TEAMS = ['BD', 'Dev', 'Marketing', 'HR']

const TYPE_COLORS = {
  'Laptop':  { bg: '#ede9fe', color: '#7c3aed' },
  'Phone':   { bg: '#d1fae5', color: '#059669' },
  'Monitor': { bg: '#ffedd5', color: '#ea580c' },
}

const Chevron = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TypeBadge = ({ type }) => {
  const s = TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
      background: s.bg, color: s.color, flexShrink: 0,
    }}>{type}</span>
  )
}

const EMPTY_FORM = { tenThietBi: '', loaiMay: '', nhanSuSuDung: '', team: '' }

const toFormValues = (d) => ({
  tenThietBi: d.tenThietBi || '',
  loaiMay: d.loaiMay || '',
  nhanSuSuDung: d.nhanSuSuDung || '',
  team: d.team || '',
})

export default function Device() {
  const { getToken } = useAuth()
  const { devices, setDevices } = useData()
  const [teamFilter, setTeamFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

  const handleBulkImport = async (items) => {
    const token = await getToken()
    const res = await fetch('/api/devices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const created = await res.json()
    setDevices(prev => [...prev, ...created])
  }

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (d, e) => { e.stopPropagation(); setEditTarget(d); setForm(toFormValues(d)); setShowModal(true) }
  const openAddToType = (loaiMay, e) => { e.stopPropagation(); setEditTarget(null); setForm({ ...EMPTY_FORM, loaiMay }); setShowModal(true) }

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const token = await getToken()
      if (editTarget) {
        const res = await fetch(`/api/devices/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const updated = await res.json()
        setDevices(prev => prev.map(d => d.id === updated.id ? updated : d))
      } else {
        const res = await fetch('/api/devices/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const created = await res.json()
        setDevices(prev => [...prev, created])
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

  const handleDelete = async (d, e) => {
    e.stopPropagation()
    if (!confirm(`Xóa thiết bị "${d.tenThietBi}"? Không thể hoàn tác.`)) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/devices/${d.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDevices(prev => prev.filter(x => x.id !== d.id))
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const typeCounts = useMemo(() => devices.reduce((acc, d) => {
    const k = d.loaiMay || 'Khác'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {}), [devices])

  const filtered = useMemo(() => devices.filter(d => {
    if (teamFilter !== 'Tất cả' && d.team !== teamFilter) return false
    if (search && !d.tenThietBi?.toLowerCase().includes(search.toLowerCase()) &&
        !d.nhanSuSuDung?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [devices, teamFilter, search])

  const groups = useMemo(() => filtered.reduce((acc, d) => {
    const k = d.loaiMay || 'Khác'
    if (!acc[k]) acc[k] = []
    acc[k].push(d)
    return acc
  }, {}), [filtered])

  return (
    <div>
      <div style={{ display: 'flex', gap: 48, marginBottom: 32, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-2px' }}>{devices.length}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Thiết bị</div>
        </div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: '-1px' }}>{count}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{type}</div>
          </div>
        ))}
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
          placeholder="Tìm thiết bị hoặc nhân sự..."
          style={{
            marginLeft: 8, border: 'none', outline: 'none', fontSize: 13,
            color: '#374151', background: 'transparent', width: 200,
          }}
        />
        <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>{filtered.length} records</span>
        <button onClick={() => setShowBulkImport(true)} style={{
          marginLeft: 'auto', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
          cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '4px 10px',
        }}>↑ Import</button>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#4f46e5', fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Thêm mới
        </button>
      </div>

      {showBulkImport && (
        <BulkImportModal
          title="Import Thiết bị hàng loạt"
          columns={DEVICE_COLUMNS}
          templateName="device-template.csv"
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {showModal && (
        <Modal title={editTarget ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'} onClose={() => { setShowModal(false); setEditTarget(null) }} onSubmit={handleSubmit} submitting={submitting}>
          <Field label="Tên thiết bị *">
            <Input required value={form.tenThietBi} onChange={e => setForm(f => ({ ...f, tenThietBi: e.target.value }))} placeholder="VD: MacBook Pro 14" />
          </Field>
          <Field label="Loại máy">
            <Select value={form.loaiMay} onChange={e => setForm(f => ({ ...f, loaiMay: e.target.value }))}>
              <option value="">-- Chọn loại --</option>
              <option value="Laptop">Laptop</option>
              <option value="Phone">Phone</option>
              <option value="Monitor">Monitor</option>
            </Select>
          </Field>
          <Field label="Nhân sự sử dụng">
            <Input value={form.nhanSuSuDung} onChange={e => setForm(f => ({ ...f, nhanSuSuDung: e.target.value }))} placeholder="Tên nhân sự" />
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
        ) : Object.entries(groups).map(([type, items]) => {
          const inUse = items.filter(d => d.nhanSuSuDung).length
          return (
            <div key={type} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div
                onClick={() => setExpanded(expanded === type ? null : type)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer' }}
              >
                <TypeBadge type={type} />
                <span style={{ fontSize: 14, color: '#374151' }}>{items.length} chiếc</span>
                {inUse > 0 && (
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{inUse} đang sử dụng</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={e => openAddToType(type, e)} title="Thêm thiết bị loại này" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>+</button>
                  <Chevron open={expanded === type} />
                </div>
              </div>
              {expanded === type && (
                <div style={{ paddingBottom: 8 }}>
                  {items.map(d => (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '8px 16px', borderRadius: 6, marginBottom: 2,
                      background: '#fafafa', fontSize: 13, color: '#374151',
                    }}>
                      <span style={{ flex: 1, fontWeight: 500 }}>{d.tenThietBi || '—'}</span>
                      <span style={{ color: '#6b7280', minWidth: 120 }}>{d.nhanSuSuDung || 'Chưa sử dụng'}</span>
                      {d.team && <span style={{ color: '#9ca3af' }}>{d.team}</span>}
                      <button onClick={e => openEdit(d, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '2px 6px' }}>Sửa</button>
                      <button onClick={e => handleDelete(d, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '2px 6px' }}>Xóa</button>
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
