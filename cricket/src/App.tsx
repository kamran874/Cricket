import { useState } from 'react'
import { MatchesProvider } from './store'
import { Splash } from './pages/Splash'
import { Home } from './pages/Home'
import { Setup } from './pages/Setup'
import { Live } from './pages/Live'

type View = { name: 'splash' } | { name: 'home' } | { name: 'setup' } | { name: 'live'; matchId: string }

const linkedMatchId = location.hash.slice(1) || null

function goLive(matchId: string, setView: (v: View) => void) {
  location.hash = matchId
  setView({ name: 'live', matchId })
}

function goHome(setView: (v: View) => void) {
  history.replaceState(null, '', location.pathname + location.search)
  setView({ name: 'home' })
}

function Shell() {
  const [view, setView] = useState<View>({ name: 'splash' })

  if (view.name === 'splash')
    return <Splash onDone={() => setView(linkedMatchId ? { name: 'live', matchId: linkedMatchId } : { name: 'home' })} />
  if (view.name === 'setup')
    return <Setup onCancel={() => goHome(setView)} onStarted={(matchId) => goLive(matchId, setView)} />
  if (view.name === 'live') return <Live matchId={view.matchId} onBack={() => goHome(setView)} />
  return <Home onNew={() => setView({ name: 'setup' })} onOpen={(matchId) => goLive(matchId, setView)} />
}

function App() {
  return (
    <MatchesProvider>
      <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
        <Shell />
      </div>
    </MatchesProvider>
  )
}

export default App
