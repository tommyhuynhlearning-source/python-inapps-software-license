import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

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

export default function Security() {
  const { getToken } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamFilter, setTeamFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

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

  if (loading) return <div style={{ color: '#9ca3af', padding: '40px 0' }}>Loading...</div>
  if (error) return <div style={{ color: '#ef4444', padding: '16px' }}>{error}</div>

  const uniqueServices = new Set(records.map(r => r.tenService).filter(Boolean)).size
  const uniqueOwners = new Set(records.map(r => r.nguoiNamGiu).filter(Boolean)).size

  const filtered = records.filter(r => {
    if (teamFilter !== 'Tất cả' && r.team !== teamFilter) return false
    if (search && !r.tenService?.toLowerCase().includes(search.toLowerCase()) &&
        !r.nguoiNamGiu?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const groups = filtered.reduce((acc, r) => {
    const k = r.tenService || 'Khác'
    if (!acc[k]) acc[k] = []
    acc[k].push(r)
    return acc
  }, {})

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
