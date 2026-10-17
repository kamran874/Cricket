import { useState } from 'react'
import { MatchesProvider } from './store'
import { Splash } from './pages/Splash'
import { Home } from './pages/Home'
import { Setup } from './pages/Setup'
import { Live } from './pages/Live'

type View = { name: 'splash' } | { name: 'home' } | { name: 'setup' } | { name: 'live'; matchId: string }

function Shell() {
  const [view, setView] = useState<View>({ name: 'splash' })

  if (view.name === 'splash') return <Splash onDone={() => setView({ name: 'home' })} />
  if (view.name === 'setup')
    return <Setup onCancel={() => setView({ name: 'home' })} onStarted={(matchId) => setView({ name: 'live', matchId })} />
  if (view.name === 'live') return <Live matchId={view.matchId} onBack={() => setView({ name: 'home' })} />
  return <Home onNew={() => setView({ name: 'setup' })} onOpen={(matchId) => setView({ name: 'live', matchId })} />
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
