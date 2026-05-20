import { useEffect } from 'react'

export default function Modal({ title, onClose, onSubmit, submitting, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 10, padding: '28px 32px',
          width: 480, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {children}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb',
              background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151',
            }}>Huỷ</button>
            <button type="submit" disabled={submitting} style={{
              padding: '8px 16px', borderRadius: 6, border: 'none',
              background: '#111827', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500, opacity: submitting ? 0.6 : 1,
            }}>{submitting ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
  fontSize: 13, color: '#111827', outline: 'none',
}

export function Input(props) {
  return <input {...props} style={inputStyle} />
}

export function Select({ children, ...props }) {
  return <select {...props} style={inputStyle}>{children}</select>
}
