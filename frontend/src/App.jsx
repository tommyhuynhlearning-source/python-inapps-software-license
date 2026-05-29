import { useState, useEffect } from 'react'
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { signOutUser } from './firebase'
import License from './pages/License'
import Device from './pages/Device'
import Security from './pages/Security'
import ODC from './pages/ODC'
import AWS from './pages/AWS'
import Login from './pages/Login'

const SIDEBAR_W = 220
const SIDEBAR_W_COLLAPSED = 56

const NAV_ITEMS = [
  { path: '/license', label: 'Licenses', emoji: '🔑', sub: 'Quản lý tài khoản phần mềm' },
  { path: '/device', label: 'Devices', emoji: '🖥️', sub: 'Quản lý thiết bị nhân sự' },
  { path: '/odc', label: 'ODC', emoji: '👥', sub: 'Task Odoo · Alias Mail' },
  { path: '/security', label: 'Security', emoji: '🛡️', sub: 'Credentials & access' },
  { path: '/aws', label: 'AWS', emoji: '☁️', sub: 'Cloud · ap-southeast-1' },
]

function Sidebar({ displayName, initial, collapsed, onToggle }) {
  return (
    <aside style={{
      width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
      background: '#111827',
      position: 'sticky',
      top: 0,
      height: '100vh',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.2s ease',
    }}>
      <div style={{
        padding: '20px 12px 14px',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.3px' }}>InApps</span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6b7280', padding: '4px 6px', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1, flexShrink: 0,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ path, label, emoji }) => (
          <NavLink key={path} to={path} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
            {({ isActive }) => (
              <div
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 9,
                  padding: '8px 10px', borderRadius: 6,
                  color: isActive ? '#f9fafb' : '#6b7280',
                  background: isActive ? '#1f2937' : 'transparent',
                  fontSize: 14, fontWeight: isActive ? 500 : 400,
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
                {!collapsed && label}
                {!collapsed && isActive && (
                  <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#818cf8', flexShrink: 0 }} />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '14px 12px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              title={displayName}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: '#059669',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, cursor: 'default',
              }}
            >{initial}</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#059669',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>{initial}</div>
              <span style={{ fontSize: 13, color: '#d1d5db', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
            </div>
            <button onClick={signOutUser} style={{
              width: '100%', padding: '6px 8px', borderRadius: 5,
              background: '#1f2937', border: 'none', color: '#6b7280',
              fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}>
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

function Topbar() {
  const { pathname } = useLocation()
  const meta = NAV_ITEMS.find(n => n.path === pathname)
  if (!meta) return null
  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center',
      padding: '0 32px', borderBottom: '1px solid #e5e7eb',
      background: '#fff', flexShrink: 0,
    }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{meta.label}</span>
      <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 10 }}>{meta.sub}</span>
    </div>
  )
}

function AppContent() {
  const { loading, error } = useData()
  if (loading) return <div style={{ color: '#9ca3af', padding: '40px 32px' }}>Loading...</div>
  if (error) return <div style={{ color: '#ef4444', padding: '16px 32px' }}>{error}</div>
  return (
    <div style={{ padding: '28px 32px' }}>
      <Routes>
        <Route path="/" element={<Navigate to="/license" replace />} />
        <Route path="/license" element={<License />} />
        <Route path="/device" element={<Device />} />
        <Route path="/security" element={<Security />} />
        <Route path="/odc" element={<ODC />} />
        <Route path="/aws" element={<AWS />} />
      </Routes>
    </div>
  )
}

const REAUTH_URL = '/api/admin/reauth?secret=inapps-reauth-2024'

export default function App() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [firebaseOk, setFirebaseOk] = useState(undefined)

  useEffect(() => {
    if (!user) return
    fetch('/api/admin/firebase-health')
      .then(r => setFirebaseOk(r.ok))
      .catch(() => setFirebaseOk(false))
  }, [user])

  useEffect(() => {
    if (firebaseOk === false) {
      window.location.href = REAUTH_URL
    }
  }, [firebaseOk])

  if (user === undefined || (user && firebaseOk === undefined)) return (
    <div style={{ padding: 40, color: '#9ca3af', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      Loading...
    </div>
  )
  if (user === null) return <Login />

  if (firebaseOk === false) return (
    <div style={{ padding: 40, color: '#9ca3af', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      Firebase token hết hạn. Đang chuyển hướng xác thực lại...
    </div>
  )

  const initial = (user.displayName || user.email)[0].toUpperCase()
  const displayName = user.displayName || user.email.split('@')[0]

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      display: 'flex', minHeight: '100vh', color: '#111827',
    }}>
      <Sidebar
        displayName={displayName}
        initial={initial}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', minHeight: '100vh' }}>
        <Topbar />
        <DataProvider>
          <AppContent />
        </DataProvider>
      </div>
    </div>
  )
}
