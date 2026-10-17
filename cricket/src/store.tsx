import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRecent, removeFromRecent, type RecentEntry } from './lib/matchStore'

interface RecentContextValue {
  recent: RecentEntry[]
  refresh: () => void
  remove: (id: string) => void
}

const RecentContext = createContext<RecentContextValue | null>(null)

export function MatchesProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<RecentEntry[]>(() => getRecent())

  const refresh = useCallback(() => setRecent(getRecent()), [])

  useEffect(() => {
    // another tab's write, or this tab writing a match, updates the cache —
    // poll on focus/visibility is enough for a "recent matches" convenience list
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  const remove = useCallback(
    (id: string) => {
      removeFromRecent(id)
      refresh()
    },
    [refresh],
  )

  const value = useMemo(() => ({ recent, refresh, remove }), [recent, refresh, remove])

  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>
}

export function useMatches(): RecentContextValue {
  const ctx = useContext(RecentContext)
  if (!ctx) throw new Error('useMatches must be used within MatchesProvider')
  return ctx
}
