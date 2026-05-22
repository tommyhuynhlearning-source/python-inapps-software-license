import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const IT_SERVICE_PROJECT = 'IT Service'

export default function ODC() {
  const { getToken } = useAuth()
  const [taskName, setTaskName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdTasks, setCreatedTasks] = useState([])
  const [toast, setToast] = useState(null)

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

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>ODC</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          Quản lý task Odoo — Project: <strong>{IT_SERVICE_PROJECT}</strong>
        </p>
      </div>

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
