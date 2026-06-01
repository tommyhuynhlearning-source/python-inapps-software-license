import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ hd: 'inapps.net' })

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export function signOutUser() {
  return signOut(auth)
}

// True if the current URL carries a reauth id_token (set by the reauth
// callback). Used to gate the loading state so we don't flash the Login page.
export function hasReauthToken() {
  return /[#&]fbauth=/.test(window.location.hash)
}

// Consume the id_token left in the URL fragment by the reauth callback and
// sign the user into Firebase Auth. Clears the fragment immediately so the
// short-lived token isn't reused or left in history. Returns true on success.
export async function consumeReauthToken() {
  const m = window.location.hash.match(/[#&]fbauth=([^&]+)/)
  if (!m) return false
  const idToken = decodeURIComponent(m[1])
  history.replaceState(null, '', window.location.pathname + window.location.search)
  try {
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
    return true
  } catch (err) {
    console.error('reauth -> Firebase sign-in failed:', err)
    return false
  }
}
