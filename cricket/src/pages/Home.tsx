import { useMatches } from '../store'
import { oversDisplay } from '../lib/engine'
import { team } from '../lib/match'

export function Home({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const { matches } = useMatches()
  const live = matches.filter((m) => m.status === 'live')
  const done = matches.filter((m) => m.status === 'completed')

  return (
    <div className="mx-auto max-w-md px-4 pb-10" style={{ paddingTop: 'calc(1.75rem + var(--safe-top))' }}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[20px]">🏏</span>
        <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Star Kala Gujran
        </span>
      </div>
      <h1 className="mb-5 text-[26px] font-bold" style={{ fontFamily: "'Oswald'", color: 'var(--text-primary)' }}>
        Matches
      </h1>

      {matches.length === 0 && (
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
              <MatchRow key={m.id} matchId={m.id} onOpen={onOpen} />
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
              <MatchRow key={m.id} matchId={m.id} onOpen={onOpen} />
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

function MatchRow({ matchId, onOpen }: { matchId: string; onOpen: (id: string) => void }) {
  const { matches } = useMatches()
  const m = matches.find((x) => x.id === matchId)
  if (!m) return null
  return (
    <button
      onClick={() => onOpen(m.id)}
      className="rounded-2xl p-4 text-left"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {m.teamA.name} vs {m.teamB.name}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
          style={{
            background: m.status === 'live' ? 'var(--pitch)' : 'var(--border-hairline)',
            color: m.status === 'live' ? 'var(--pitch-ink)' : 'var(--text-secondary)',
          }}
        >
          {m.status === 'live' ? 'Live' : 'Final'}
        </span>
      </div>
      <div className="font-mono text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
        {m.innings
          .map((inn) => `${team(m, inn.battingTeam).name} ${inn.runs}/${inn.wickets} (${oversDisplay(inn.legalBalls)})`)
          .join(' · ') || 'Not started'}
      </div>
      {m.result && (
        <div className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {m.result}
        </div>
      )}
    </button>
  )
}
