import { useState } from 'react'
import type { TeamKey } from '../types'
import { createMatch } from '../lib/match'
import { useMatches } from '../store'

const inputClass = 'w-full rounded-xl px-3 py-2.5 text-[15px] outline-none'
const inputStyle = { background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }

export function Setup({ onStarted, onCancel }: { onStarted: (matchId: string) => void; onCancel: () => void }) {
  const { saveMatch } = useMatches()
  const [step, setStep] = useState(1)

  const [teamAName, setTeamAName] = useState('')
  const [teamBName, setTeamBName] = useState('')
  const [oversLimit, setOversLimit] = useState(20)
  const [playersPerSide, setPlayersPerSide] = useState(11)
  const [tossWinner, setTossWinner] = useState<TeamKey>('A')
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat')
  const [strikerName, setStrikerName] = useState('')
  const [nonStrikerName, setNonStrikerName] = useState('')
  const [bowlerName, setBowlerName] = useState('')

  const battingFirst = tossDecision === 'bat' ? tossWinner : tossWinner === 'A' ? 'B' : 'A'
  const battingFirstName = battingFirst === 'A' ? teamAName || 'Team A' : teamBName || 'Team B'

  const canFinish = strikerName.trim() && nonStrikerName.trim() && bowlerName.trim()

  function finish() {
    const match = createMatch({
      teamAName: teamAName || 'Team A',
      teamBName: teamBName || 'Team B',
      oversLimit,
      playersPerSide,
      tossWinner,
      tossDecision,
      openingStrikerName: strikerName,
      openingNonStrikerName: nonStrikerName,
      openingBowlerName: bowlerName,
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
          Step {step} of 3
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
            className={inputClass + ' mb-4'}
            style={inputStyle}
          />
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Team B name
          </label>
          <input
            value={teamBName}
            onChange={(e) => setTeamBName(e.target.value)}
            placeholder="e.g. Lane End XI"
            className={inputClass + ' mb-4'}
            style={inputStyle}
          />
          <div className="mb-6 flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Overs per side
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={oversLimit}
                onChange={(e) => setOversLimit(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Players per side
              </label>
              <input
                type="number"
                min={2}
                max={11}
                value={playersPerSide}
                onChange={(e) => setPlayersPerSide(Math.max(2, Math.min(11, parseInt(e.target.value, 10) || 2)))}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
          <p className="mb-6 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            You don't need to list every player now — you'll just name each batsman and bowler as they come up during
            the match.
          </p>
          <button
            disabled={!teamAName.trim() || !teamBName.trim()}
            onClick={() => setStep(2)}
            className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--pitch)' }}
          >
            Next: Toss
          </button>
        </div>
      )}

      {step === 2 && (
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
                {k === 'A' ? teamAName || 'Team A' : teamBName || 'Team B'}
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
            {battingFirstName} will bat first.
          </p>
          <button onClick={() => setStep(3)} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white" style={{ background: 'var(--pitch)' }}>
            Next: Opening players
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-4 text-[20px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            Who's opening?
          </h2>
          <p className="mb-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Just the three names to get started — {battingFirstName} bat first.
          </p>
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Striker (on strike)
          </label>
          <input
            value={strikerName}
            onChange={(e) => setStrikerName(e.target.value)}
            placeholder="Player name"
            className={inputClass + ' mb-4'}
            style={inputStyle}
          />
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Non-striker
          </label>
          <input
            value={nonStrikerName}
            onChange={(e) => setNonStrikerName(e.target.value)}
            placeholder="Player name"
            className={inputClass + ' mb-4'}
            style={inputStyle}
          />
          <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Opening bowler
          </label>
          <input
            value={bowlerName}
            onChange={(e) => setBowlerName(e.target.value)}
            placeholder="Player name"
            className={inputClass + ' mb-6'}
            style={inputStyle}
          />
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
