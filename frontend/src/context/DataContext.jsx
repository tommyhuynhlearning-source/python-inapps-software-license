import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { getToken } = useAuth()
  const [licenses, setLicenses] = useState([])
  const [devices, setDevices] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getToken()
      .then(token => {
        const headers = { Authorization: `Bearer ${token}` }
        return Promise.all([
          fetch('/api/licenses/', { headers, signal: AbortSignal.timeout(50000) }).then(r => {
            if (!r.ok) throw new Error(`Licenses: HTTP ${r.status}`)
            return r.json()
          }),
          fetch('/api/devices/', { headers, signal: AbortSignal.timeout(50000) }).then(r => {
            if (!r.ok) throw new Error(`Devices: HTTP ${r.status}`)
            return r.json()
          }),
          fetch('/api/security/events', { headers, signal: AbortSignal.timeout(50000) }).then(r => {
            if (!r.ok) throw new Error(`Security: HTTP ${r.status}`)
            return r.json()
          }),
        ])
      })
      .then(([lic, dev, sec]) => {
        setLicenses(lic)
        setDevices(dev)
        setRecords(sec)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DataContext.Provider value={{
      licenses, setLicenses,
      devices, setDevices,
      records, setRecords,
      loading, error,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
