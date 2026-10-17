import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Match } from './types'
import * as storage from './lib/storage'

interface MatchesContextValue {
  matches: Match[]
  saveMatch: (m: Match) => void
  removeMatch: (id: string) => void
  refresh: () => void
}

const MatchesContext = createContext<MatchesContextValue | null>(null)

export function MatchesProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<Match[]>(() => storage.getMatches())

  const refresh = useCallback(() => setMatches(storage.getMatches()), [])

  const saveMatch = useCallback((m: Match) => {
    storage.upsertMatch(m)
    setMatches(storage.getMatches())
  }, [])

  const removeMatch = useCallback((id: string) => {
    storage.deleteMatch(id)
    setMatches(storage.getMatches())
  }, [])

  const value = useMemo(() => ({ matches, saveMatch, removeMatch, refresh }), [matches, saveMatch, removeMatch, refresh])

  return <MatchesContext.Provider value={value}>{children}</MatchesContext.Provider>
}

export function useMatches(): MatchesContextValue {
  const ctx = useContext(MatchesContext)
  if (!ctx) throw new Error('useMatches must be used within MatchesProvider')
  return ctx
}
