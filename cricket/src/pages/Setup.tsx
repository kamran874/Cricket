import { useMemo, useState } from 'react'
import type { Player, TeamKey } from '../types'
import { createMatch, opposingKey } from '../lib/match'
import { useMatches } from '../store'

function uid() {
  return crypto.randomUUID()
}

function PlayerListEditor({
  teamName,
  players,
  setPlayers,
}: {
  teamName: string
  players: Player[]
  setPlayers: (p: Player[]) => void
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const name = draft.trim()
    if (!name) return
    setPlayers([...players, { id: uid(), name }])
    setDraft('')
  }
  function remove(id: string) {
    setPlayers(players.filter((p) => p.id !== id))
  }

  return (
    <div>
      <p className="mb-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        Enter the playing XI for <b style={{ color: 'var(--text-primary)' }}>{teamName || 'this team'}</b>. Add at
        least 2 players; you can add more any time.
      </p>
      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Player name"
          className="flex-1 rounded-xl px-3 py-2.5 text-[14.5px] outline-none"
          style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
        />
        <button onClick={add} className="rounded-xl px-4 text-[14px] font-semibold text-white" style={{ background: 'var(--pitch)' }}>
          Add
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {players.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: 'var(--surface-card)' }}
          >
            <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
              {i + 1}. {p.name}
            </span>
            <button onClick={() => remove(p.id)} className="text-[13px] font-semibold" style={{ color: 'var(--wicket)' }}>
              Remove
            </button>
          </div>
        ))}
        {players.length === 0 && (
          <p className="py-3 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            No players added yet.
          </p>
        )}
      </div>
    </div>
  )
}

export function Setup({ onStarted, onCancel }: { onStarted: (matchId: string) => void; onCancel: () => void }) {
  const { saveMatch } = useMatches()
  const [step, setStep] = useState(1)

  const [teamAName, setTeamAName] = useState('')
  const [teamBName, setTeamBName] = useState('')
  const [oversLimit, setOversLimit] = useState(20)
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([])
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([])
  const [tossWinner, setTossWinner] = useState<TeamKey>('A')
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat')
  const [strikerId, setStrikerId] = useState('')
  const [nonStrikerId, setNonStrikerId] = useState('')
  const [bowlerId, setBowlerId] = useState('')

  const battingFirst = tossDecision === 'bat' ? tossWinner : opposingKey(tossWinner)
  const draftMatch = useMemo(
    () => ({ teamA: { name: teamAName || 'Team A', players: teamAPlayers }, teamB: { name: teamBName || 'Team B', players: teamBPlayers } }),
    [teamAName, teamBName, teamAPlayers, teamBPlayers],
  )
  const battingXI = battingFirst === 'A' ? teamAPlayers : teamBPlayers
  const bowlingXI = battingFirst === 'A' ? teamBPlayers : teamAPlayers

  const canStep2 = teamAPlayers.length >= 2
  const canStep3 = teamBPlayers.length >= 2
  const canFinish = strikerId && nonStrikerId && strikerId !== nonStrikerId && bowlerId

  function finish() {
    const match = createMatch({
      teamA: { name: teamAName || 'Team A', players: teamAPlayers },
      teamB: { name: teamBName || 'Team B', players: teamBPlayers },
      oversLimit,
      tossWinner,
      tossDecision,
      openingStrikerId: strikerId,
      openingNonStrikerId: nonStrikerId,
      openingBowlerId: bowlerId,
    })
    saveMatch(match)
    onStarted(match.id)
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16" style={{ paddingTop: 'calc(1.5rem + var(--safe-top))' }}>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="text-[20px]" style={{ color: 'var(--text-secondary)' }}>
          ←
        </button>
        <span className="text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Step {step} of 5
        </span>
      </div>

      {step === 1 && (
        <div>
          <h2 className="mb-4 text-[20px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            Teams &amp; overs
          </h2>
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Team A name
          </label>
          <input
            value={teamAName}
            onChange={(e) => setTeamAName(e.target.value)}
            placeholder="e.g. Star Kala Gujran"
            className="mb-4 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
          />
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Team B name
          </label>
          <input
            value={teamBName}
            onChange={(e) => setTeamBName(e.target.value)}
            placeholder="e.g. Lane End XI"
            className="mb-4 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
          />
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Total overs per side
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={oversLimit}
            onChange={(e) => setOversLimit(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
            className="mb-6 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
          />
          <button
            disabled={!teamAName.trim() || !teamBName.trim()}
            onClick={() => setStep(2)}
            className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--pitch)' }}
          >
            Next: Team A players
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-4 text-[20px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            {draftMatch.teamA.name} — playing XI
          </h2>
          <PlayerListEditor teamName={draftMatch.teamA.name} players={teamAPlayers} setPlayers={setTeamAPlayers} />
          <button
            disabled={!canStep2}
            onClick={() => setStep(3)}
            className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--pitch)' }}
          >
            Next: Team B players
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-4 text-[20px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            {draftMatch.teamB.name} — playing XI
          </h2>
          <PlayerListEditor teamName={draftMatch.teamB.name} players={teamBPlayers} setPlayers={setTeamBPlayers} />
          <button
            disabled={!canStep3}
            onClick={() => setStep(4)}
            className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--pitch)' }}
          >
            Next: Toss
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="mb-4 text-[20px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            Toss
          </h2>
          <label className="mb-2 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Won the toss
          </label>
          <div className="mb-5 flex gap-2">
            {(['A', 'B'] as TeamKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setTossWinner(k)}
                className="flex-1 rounded-xl py-2.5 text-[14px] font-semibold"
                style={{
                  background: tossWinner === k ? 'var(--pitch)' : 'var(--surface-card)',
                  color: tossWinner === k ? 'var(--pitch-ink)' : 'var(--text-secondary)',
                }}
              >
                {k === 'A' ? draftMatch.teamA.name : draftMatch.teamB.name}
              </button>
            ))}
          </div>
          <label className="mb-2 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Chose to
          </label>
          <div className="mb-6 flex gap-2">
            {(['bat', 'bowl'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setTossDecision(d)}
                className="flex-1 rounded-xl py-2.5 text-[14px] font-semibold capitalize"
                style={{
                  background: tossDecision === d ? 'var(--pitch)' : 'var(--surface-card)',
                  color: tossDecision === d ? 'var(--pitch-ink)' : 'var(--text-secondary)',
                }}
              >
                {d} first
              </button>
            ))}
          </div>
          <p className="mb-6 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {(battingFirst === 'A' ? draftMatch.teamA.name : draftMatch.teamB.name)} will bat first.
          </p>
          <button
            onClick={() => setStep(5)}
            className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white"
            style={{ background: 'var(--pitch)' }}
          >
            Next: Opening players
          </button>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="mb-4 text-[20px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            Who's opening?
          </h2>
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Striker (on strike)
          </label>
          <select
            value={strikerId}
            onChange={(e) => setStrikerId(e.target.value)}
            className="mb-4 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
          >
            <option value="">Select player</option>
            {battingXI.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Non-striker
          </label>
          <select
            value={nonStrikerId}
            onChange={(e) => setNonStrikerId(e.target.value)}
            className="mb-4 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
          >
            <option value="">Select player</option>
            {battingXI.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === strikerId}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Opening bowler
          </label>
          <select
            value={bowlerId}
            onChange={(e) => setBowlerId(e.target.value)}
            className="mb-6 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
          >
            <option value="">Select player</option>
            {bowlingXI.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            disabled={!canFinish}
            onClick={finish}
            className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--pitch)' }}
          >
            Start match
          </button>
        </div>
      )}
    </div>
  )
}
