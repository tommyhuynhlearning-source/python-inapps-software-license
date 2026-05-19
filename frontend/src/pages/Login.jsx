import { useState } from 'react'
import { signInWithGoogle } from '../firebase'

export default function Login() {
  const [error, setError] = useState(null)

  async function handleSignIn() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message)
      }
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '1.5rem',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ margin: 0 }}>InApps Software License</h1>
      <p style={{ color: '#666', margin: 0 }}>
        Đăng nhập bằng tài khoản inapps.net để tiếp tục.
      </p>
      <button
        onClick={handleSignIn}
        style={{
          padding: '0.75rem 2rem', fontSize: '1rem',
          border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer',
          background: '#fff', fontFamily: 'sans-serif', fontWeight: 500,
        }}
      >
        Đăng nhập với Google
      </button>
      {error && <p style={{ color: 'red', maxWidth: 400, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
