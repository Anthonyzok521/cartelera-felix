import { useEffect, useState } from 'react'
import Display from './pages/Display'
import Admin from './pages/Admin'

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return hash
}

export default function App() {
  const hash = useHashRoute()
  return hash.startsWith('#/admin') ? <Admin /> : <Display />
}
