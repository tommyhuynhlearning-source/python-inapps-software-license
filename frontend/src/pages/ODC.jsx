import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore'

const IT_SERVICE_PROJECT = 'IT Service'
const DEFAULT_CONFIG = { status: 'active', odc_type: 'odc' }
const NON_ODC_DEFAULTS = new Set(['legal@inapps.net', 'vy.doan@inapps.net'])

function useAliasMail(getToken) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const res = await fetch('/api/aws/dynamodb/alias-mail-aliases/items', {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) throw new Error(res.statusText)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])
  return { data, loading, error }
}

export default function ODC() {
  const { getToken } = useAuth()
  const [aliasConfig, setAliasConfig] = useState({})
  const syncedRef = useRef(false)
  const [taskName, setTaskName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdTasks, setCreatedTasks] = useState([])
  const [toast, setToast] = useState(null)
  const [aliasSearch, setAliasSearch] = useState('')
  const aliases = useAliasMail(getToken)

  // Load Firestore config on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, 'alias-mail-config'))
        const data = {}
        snap.forEach(d => { data[d.id] = d.data() })
        if (!cancelled) setAliasConfig(prev => ({ ...data, ...prev }))
      } catch { /* use defaults */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Sync Firestore with DynamoDB list (runs once after list loads)
  useEffect(() => {
    if (!aliases.data || syncedRef.current) return
    syncedRef.current = true
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, 'alias-mail-config'))
        const existing = {}
        snap.forEach(d => { existing[d.id] = d.data() })

        const emails = new Set(aliases.data.map(a => a.alias_email))
        const batch = writeBatch(db)
        const created = {}
        const corrected = {}
        const deleted = []

        for (const email of emails) {
          if (!(email in existing)) {
            const entry = NON_ODC_DEFAULTS.has(email)
              ? { status: 'active', odc_type: 'non-odc' }
              : { status: 'active', odc_type: 'odc' }
            batch.set(doc(db, 'alias-mail-config', email), entry)
            created[email] = entry
          } else if (NON_ODC_DEFAULTS.has(email) && existing[email].odc_type === 'odc') {
            const entry = { ...existing[email], odc_type: 'non-odc' }
            batch.set(doc(db, 'alias-mail-config', email), entry)
            corrected[email] = entry
          }
        }
        for (const email of Object.keys(existing)) {
          if (!emails.has(email)) {
            batch.delete(doc(db, 'alias-mail-config', email))
            deleted.push(email)
          }
        }
        await batch.commit()

        setAliasConfig(prev => {
          const next = { ...prev }
          for (const [email, cfg] of Object.entries(created)) {
            if (!(email in next)) next[email] = cfg
          }
          Object.assign(next, corrected)
          for (const email of deleted) delete next[email]
          return next
        })
      } catch { /* non-critical */ }
    })()
  }, [aliases.data])

  const updateConfig = async (email, patch) => {
    const current = aliasConfig[email] || DEFAULT_CONFIG
    const next = { ...current, ...patch }
    setAliasConfig(prev => ({ ...prev, [email]: next }))
    try {
      await setDoc(doc(db, 'alias-mail-config', email), next)
    } catch {
      setAliasConfig(prev => ({ ...prev, [email]: current }))
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleCreate = async () => {
    if (!taskName.trim()) return
    setCreating(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/odoo/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: taskName.trim() }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
      const created = await res.json()
      setCreatedTasks(prev => [{ ...created, createdAt: new Date() }, ...prev])
      setTaskName('')
      showToast(`Đã tạo task "${created.name}" — Email thông báo đã gửi`)
    } catch (e) {
      showToast(e.name === 'TimeoutError' ? 'Request timeout — vui lòng thử lại' : e.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleCreate() }

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: toast.type === 'error' ? '#dc2626' : '#16a34a',
          padding: '10px 16px', borderRadius: 8, fontSize: 14, maxWidth: 360,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Create task row */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24,
        padding: '12px 16px',
        border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa',
      }}>
        <input
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tên task mới..."
          style={{
            flex: 1, border: '1px solid #e5e7eb', borderRadius: 6,
            padding: '7px 12px', fontSize: 14, outline: 'none',
            background: '#fff',
          }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !taskName.trim()}
          style={{
            padding: '7px 18px', borderRadius: 6, border: 'none',
            background: creating || !taskName.trim() ? '#d1d5db' : '#4f46e5',
            color: '#fff', fontSize: 14, fontWeight: 500,
            cursor: creating || !taskName.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {creating ? 'Đang tạo...' : '+ Tạo task'}
        </button>
      </div>

      {/* Alias Mail section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Alias Mail</span>
            {aliases.data && (
              <span style={{
                marginLeft: 8, background: '#ede9fe', color: '#6d28d9',
                borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 500,
              }}>
                {aliases.data.length}
              </span>
            )}
          </div>
          <input
            value={aliasSearch}
            onChange={e => setAliasSearch(e.target.value)}
            placeholder="Tìm tên hoặc email..."
            style={{
              border: '1px solid #e5e7eb', borderRadius: 6,
              padding: '5px 10px', fontSize: 13, outline: 'none',
              width: 220, background: '#fff',
            }}
          />
        </div>

        {aliases.loading && (
          <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>Đang tải...</div>
        )}
        {aliases.error && (
          <div style={{ color: '#ef4444', fontSize: 13 }}>{aliases.error}</div>
        )}
        {aliases.data && (() => {
          const q = aliasSearch.toLowerCase()
          const filtered = aliases.data.filter(a =>
            a.display_name.toLowerCase().includes(q) || a.alias_email.toLowerCase().includes(q)
          )
          return (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#374151', fontSize: 13 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#374151', fontSize: 13 }}>Tên</th>
                    <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#374151', fontSize: 13 }}>Email alias</th>
                    <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#374151', fontSize: 13 }}>Loại</th>
                    <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#374151', fontSize: 13 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', color: '#9ca3af', textAlign: 'center' }}>Không tìm thấy</td>
                    </tr>
                  ) : filtered.map((a, i) => {
                    const cfg = aliasConfig[a.alias_email] || DEFAULT_CONFIG
                    const isNonOdc = cfg.odc_type === 'non-odc'
                    const isInactive = cfg.status === 'inactive'
                    return (
                      <tr
                        key={a.alias_email}
                        style={{
                          borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: i % 2 === 0 ? '#fff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '9px 16px', color: '#9ca3af', fontSize: 13 }}>{i + 1}</td>
                        <td style={{ padding: '9px 16px', fontWeight: 500, color: '#111827' }}>{a.display_name}</td>
                        <td style={{ padding: '9px 16px', color: '#6b7280', fontFamily: 'monospace', fontSize: 13 }}>{a.alias_email}</td>
                        <td style={{ padding: '9px 16px' }}>
                          <span
                            onClick={() => updateConfig(a.alias_email, { odc_type: isNonOdc ? 'odc' : 'non-odc' })}
                            title={isNonOdc ? 'Click để đổi sang ODC' : 'Click để đổi sang Non ODC'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: isNonOdc ? '#fef3c7' : '#eff6ff',
                              color: isNonOdc ? '#92400e' : '#1d4ed8',
                              border: `1px solid ${isNonOdc ? '#fde68a' : '#bfdbfe'}`,
                              borderRadius: 99, padding: '2px 8px',
                              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                              cursor: 'pointer', userSelect: 'none',
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isNonOdc ? '#f59e0b' : '#3b82f6', flexShrink: 0 }} />
                            {isNonOdc ? 'Non ODC' : 'ODC'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 16px' }}>
                          <span
                            onClick={() => updateConfig(a.alias_email, { status: isInactive ? 'active' : 'inactive' })}
                            title={isInactive ? 'Click để đổi sang Active' : 'Click để đổi sang Inactive'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: isInactive ? '#f3f4f6' : '#f0fdf4',
                              color: isInactive ? '#6b7280' : '#15803d',
                              border: `1px solid ${isInactive ? '#e5e7eb' : '#bbf7d0'}`,
                              borderRadius: 99, padding: '2px 8px',
                              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                              cursor: 'pointer', userSelect: 'none',
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isInactive ? '#9ca3af' : '#22c55e', flexShrink: 0 }} />
                            {isInactive ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* Tasks created this session */}
      {createdTasks.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
            Đã tạo trong phiên này
            <span style={{
              marginLeft: 8, background: '#ede9fe', color: '#6d28d9',
              borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 500,
            }}>
              {createdTasks.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {createdTasks.map(task => (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 7,
                  border: '1px solid #e5e7eb', background: '#fff',
                }}
              >
                <div style={{ width: 3, height: 32, borderRadius: 2, flexShrink: 0, background: '#4f46e5' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {task.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}IT Service
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>
                  #{task.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
