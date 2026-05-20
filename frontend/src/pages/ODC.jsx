export default function ODC() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>ODC</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Quản lý ODC</p>
      </div>

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '48px 24px',
        textAlign: 'center',
        color: '#9ca3af',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#d1d5db" strokeWidth="1.5" />
          <path d="M3 9h18M9 21V9" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 14, margin: 0 }}>Chưa có dữ liệu</p>
      </div>
    </div>
  )
}
