import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { signOutUser } from './firebase'
import License from './pages/License'
import Device from './pages/Device'
import Security from './pages/Security'
import Login from './pages/Login'

const tabs = [
  { path: '/license', label: 'License' },
  { path: '/device', label: 'Device' },
  { path: '/security', label: 'Security' },
]

export default function App() {
  const { user } = useAuth()

  if (user === undefined) return <p style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading...</p>
  if (user === null) return <Login />

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>InApps Software License</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>{user.email}</span>
          <button
            onClick={signOutUser}
            style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', border: '1px solid #ddd', borderRadius: 4 }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #eee', marginBottom: '1.5rem' }}>
        {tabs.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              padding: '0.5rem 1rem',
              textDecoration: 'none',
              fontWeight: isActive ? 700 : 400,
              borderBottom: isActive ? '2px solid #0070f3' : '2px solid transparent',
              color: isActive ? '#0070f3' : '#333',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/license" replace />} />
        <Route path="/license" element={<License />} />
        <Route path="/device" element={<Device />} />
        <Route path="/security" element={<Security />} />
      </Routes>
    </div>
  )
}
