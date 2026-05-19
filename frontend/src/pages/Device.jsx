import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

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

export default function Device() {
  const { getToken } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamFilter, setTeamFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

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

  if (loading) return <div style={{ color: '#9ca3af', padding: '40px 0' }}>Loading...</div>
  if (error) return <div style={{ color: '#ef4444', padding: '16px' }}>{error}</div>

  const typeCounts = devices.reduce((acc, d) => {
    const k = d.loaiMay || 'Khác'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const filtered = devices.filter(d => {
    if (teamFilter !== 'Tất cả' && d.team !== teamFilter) return false
    if (search && !d.tenThietBi?.toLowerCase().includes(search.toLowerCase()) &&
        !d.nhanSuSuDung?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const groups = filtered.reduce((acc, d) => {
    const k = d.loaiMay || 'Khác'
    if (!acc[k]) acc[k] = []
    acc[k].push(d)
    return acc
  }, {})

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
        <button style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#4f46e5', fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Thêm mới
        </button>
      </div>

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
                <div style={{ marginLeft: 'auto' }}>
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
