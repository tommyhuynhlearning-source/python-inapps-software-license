import { createContext, useContext, useEffect, useState } from 'react'
import { auth, hasReauthToken, consumeReauthToken } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading

  useEffect(() => {
    // If the URL carries a reauth id_token, a Firebase sign-in is about to
    // happen — ignore the initial null emission so we don't flash the Login
    // page, then let the successful sign-in flow through onAuthStateChanged.
    let pendingReauth = hasReauthToken()
    const unsub = auth.onAuthStateChanged(u => {
      if (pendingReauth && u === null) return
      setUser(u)
    })
    if (pendingReauth) {
      consumeReauthToken().then(ok => {
        pendingReauth = false
        if (!ok) setUser(auth.currentUser) // sign-in failed → fall back to Login
      })
    }
    return unsub
  }, [])

  function getToken() {
    if (!user) return Promise.resolve(null)
    return user.getIdToken()
  }

  return (
    <AuthContext.Provider value={{ user, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
