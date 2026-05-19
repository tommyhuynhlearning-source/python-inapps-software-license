import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import License from './pages/License'
import Device from './pages/Device'
import Security from './pages/Security'

const tabs = [
  { path: '/license', label: 'License' },
  { path: '/device', label: 'Device' },
  { path: '/security', label: 'Security' },
]

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
      <h1>InApps Software License</h1>
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
