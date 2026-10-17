import { useEffect } from 'react'
import { useMatches } from '../store'
import { isFirebaseConfigured } from '../lib/matchStore'
import type { RecentEntry } from '../lib/matchStore'

export function Home({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const { recent, refresh } = useMatches()
  // Home remounts on every in-app navigation back to it (App.tsx swaps
  // component types), so this catches matches created/updated elsewhere —
  // window 'focus' alone doesn't fire for same-page view switches.
  useEffect(() => {
    refresh()
  }, [refresh])
  const live = recent.filter((m) => m.status === 'live')
  const done = recent.filter((m) => m.status === 'completed')

  return (
    <div className="mx-auto max-w-md px-4 pb-10" style={{ paddingTop: 'calc(1.75rem + var(--safe-top))' }}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[20px]">🏏</span>
        <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Star Kala Gujran
        </span>
      </div>
      <h1 className="mb-3 text-[26px] font-bold" style={{ fontFamily: "'Oswald'", color: 'var(--text-primary)' }}>
        Matches
      </h1>

      {!isFirebaseConfigured() && (
        <div className="mb-5 rounded-xl p-3 text-[12.5px]" style={{ background: 'var(--extra-soft)', color: 'var(--extra)' }}>
          Running in local-only mode — matches stay on this device. Set up Firebase (see README) to get shareable
          live-scoring links.
        </div>
      )}

      {recent.length === 0 && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface-card)' }}>
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            No matches yet. Start your first one below.
          </p>
        </div>
      )}

      {live.length > 0 && (
        <>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Live
          </h2>
          <div className="mb-5 flex flex-col gap-2">
            {live.map((m) => (
              <MatchRow key={m.id} entry={m} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Completed
          </h2>
          <div className="mb-5 flex flex-col gap-2">
            {done.map((m) => (
              <MatchRow key={m.id} entry={m} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}

      <button
        onClick={onNew}
        className="w-full rounded-2xl py-4 text-[15px] font-semibold text-white"
        style={{ background: 'var(--pitch)' }}
      >
        + New match
      </button>
    </div>
  )
}

function MatchRow({ entry, onOpen }: { entry: RecentEntry; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(entry.id)}
      className="rounded-2xl p-4 text-left"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {entry.teamA} vs {entry.teamB}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
          style={{
            background: entry.status === 'live' ? 'var(--pitch)' : 'var(--border-hairline)',
            color: entry.status === 'live' ? 'var(--pitch-ink)' : 'var(--text-secondary)',
          }}
        >
          {entry.status === 'live' ? 'Live' : 'Final'}
        </span>
      </div>
      {entry.result && (
        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {entry.result}
        </div>
      )}
    </button>
  )
}
