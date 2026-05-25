import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { signOutUser } from './firebase'
import License from './pages/License'
import Device from './pages/Device'
import Security from './pages/Security'
import ODC from './pages/ODC'
import AWS from './pages/AWS'
import Login from './pages/Login'

const S = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    minHeight: '100vh',
    background: '#fff',
    color: '#111827',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    height: 52,
    borderBottom: '1px solid #f3f4f6',
  },
  logo: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.3px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#059669',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  userName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: 500,
  },
  logoutBtn: {
    fontSize: 13,
    color: '#374151',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
  },
  nav: {
    display: 'flex',
    padding: '0 40px',
    borderBottom: '1px solid #e5e7eb',
  },
}

function AppContent() {
  const { loading, error } = useData()
  if (loading) return <div style={{ color: '#9ca3af', padding: '40px 0' }}>Loading...</div>
  if (error) return <div style={{ color: '#ef4444', padding: '16px' }}>{error}</div>
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>
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

export default function App() {
  const { user } = useAuth()

  if (user === undefined) return <div style={{ padding: 40, color: '#9ca3af', fontFamily: S.root.fontFamily }}>Loading...</div>
  if (user === null) return <Login />

  const initial = (user.displayName || user.email)[0].toUpperCase()
  const displayName = user.displayName || user.email.split('@')[0]

  return (
    <div style={S.root}>
      <header style={S.header}>
        <span style={S.logo}>InApps</span>
        <div style={S.headerRight}>
          <div style={S.avatar}>{initial}</div>
          <span style={S.userName}>{displayName}</span>
          <button style={S.logoutBtn} onClick={signOutUser}>Đăng xuất</button>
        </div>
      </header>

      <nav style={S.nav}>
        {[
          { path: '/license', label: 'Licenses' },
          { path: '/device', label: 'Devices' },
          { path: '/odc', label: 'ODC' },
          { path: '/security', label: 'Security' },
          { path: '/aws', label: 'AWS' },
        ].map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              padding: '14px 16px',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? '#111827' : '#9ca3af',
              borderBottom: isActive ? '2px solid #111827' : '2px solid transparent',
              marginBottom: -1,
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <DataProvider>
        <AppContent />
      </DataProvider>
    </div>
  )
}
