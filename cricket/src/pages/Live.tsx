import { useEffect, useState } from 'react'
import type { BallKind, DismissalType, Match } from '../types'
import { deleteMatch, watchMatch, writeMatch } from '../lib/matchStore'
import { announce, describeNonWicketBall, describeWicket, isVoiceEnabled, setVoiceEnabled } from '../lib/speech'
import { NameEntry } from '../components/NameEntry'
import {
  addBall,
  currentOverIndex,
  economyRate,
  isNewOverStarting,
  legalBallsThisOver,
  makeBall,
  oversDisplay,
  strikeRate,
  undoLastBall,
  replayPointers,
} from '../lib/engine'
import {
  bowlingTeamKey,
  buildScorecardCSV,
  currentInnings,
  eligibleBowlers,
  fieldingSidePlayers,
  finishMatch,
  playerName,
  remainingBatsmen,
  resolveOrCreatePlayer,
  startSecondInnings,
  target,
  team,
} from '../lib/match'
import { buildScorecardPDF } from '../lib/pdf'

const DISMISSALS: DismissalType[] = [
  'Bowled',
  'Caught',
  'LBW',
  'Run Out',
  'Stumped',
  'Hit Wicket',
  'Retired Out',
  'Obstructing the Field',
]
const NEEDS_FIELDER: ReadonlySet<DismissalType> = new Set(['Caught', 'Stumped', 'Run Out'])

type WicketStep = 'type' | 'runout-who' | 'fielder' | 'incoming' | null

/** Runs completed before a dismissal are only asked for Run Out; every
 *  other dismissal type scores 0 runs off that ball. */

export function Live({ matchId, onBack }: { matchId: string; onBack: () => void }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined) // undefined = still loading
  useEffect(() => {
    setMatch(undefined)
    return watchMatch(matchId, setMatch)
  }, [matchId])
  const [tab, setTab] = useState<'score' | 'scorecard'>('score')
  const [mode, setMode] = useState<BallKind>('normal')
  const [wicketStep, setWicketStep] = useState<WicketStep>(null)
  const [pendingType, setPendingType] = useState<DismissalType | null>(null)
  const [pendingOutId, setPendingOutId] = useState<string | null>(null)
  const [pendingRuns, setPendingRuns] = useState(0)
  const [pendingFielderId, setPendingFielderId] = useState<string | undefined>(undefined)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled())

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    setVoiceEnabled(next)
  }

  const inn = match ? currentInnings(match) : null
  const maxWickets = match ? match.playersPerSide - 1 : 10

  if (match === undefined) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
        Loading match…
      </div>
    )
  }

  if (!match || !inn) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="mb-4">This match link doesn't point to anything (yet, or anymore).</p>
        <button onClick={onBack} className="text-[14px] font-semibold" style={{ color: 'var(--pitch)' }}>
          ← Back home
        </button>
      </div>
    )
  }

  // Narrowed, stable aliases: `match`/`inn` are proven non-null above, but
  // TS does not carry that narrowing into function declarations (they're
  // hoisted). These const bindings let every closure below see them as
  // definitely non-null without repeating `!` everywhere.
  const m = match
  const innings = inn

  const persist = () => {
    const updated = { ...m, updatedAt: Date.now() }
    setMatch(updated)
    writeMatch(updated)
  }

  const mutate = (fn: () => void) => {
    fn()
    persist()
  }

  // A new over needs a bowler prompt only until one is actually chosen —
  // right after an over completes, currentBowlerId still equals
  // previousBowlerId (addBall only copies it over, it never clears it), so
  // that equality is what flips back to false once a (different) bowler is
  // picked. Gating on ball count alone kept this stuck forever, since
  // picking a bowler doesn't bowl a ball.
  const needsNewBowler =
    innings.overs.length > 0 && isNewOverStarting(innings) && innings.currentBowlerId === innings.previousBowlerId
  const battingTeamName = team(m, innings.battingTeam).name
  const bowlingTeamName = team(m, bowlingTeamKey(m, innings)).name

  const resetWicketWizard = () => {
    setWicketStep(null)
    setPendingType(null)
    setPendingOutId(null)
    setPendingRuns(0)
    setPendingFielderId(undefined)
    setMode('normal')
  }

  const commitWicketFinal = (
    type: DismissalType,
    outId: string,
    runs: number,
    fielderId: string | undefined,
    incomingBatsmanId: string | undefined,
  ) => {
    mutate(() => {
      const ball = makeBall('wicket', {
        batRuns: runs,
        dismissal: { type, batsmanOutId: outId, fielderId, incomingBatsmanId },
        strikerId: innings.strikerId,
        nonStrikerId: innings.nonStrikerId,
        bowlerId: innings.currentBowlerId,
        overNumber: currentOverIndex(innings),
      })
      addBall(innings, ball, m.oversLimit, maxWickets)
    })
    announce(describeWicket(type))
    resetWicketWizard()
  }

  /** Called once type/outId/runs/fielder are all settled (never relies on
   *  state just set in the same handler — every argument is passed explicitly). */
  const decideNext = (type: DismissalType, outId: string, runs: number, fielderId: string | undefined) => {
    const willBeAllOut = innings.wickets + 1 >= maxWickets
    if (willBeAllOut) {
      commitWicketFinal(type, outId, runs, fielderId, undefined)
    } else {
      setWicketStep('incoming')
    }
  }

  const pickDismissalType = (type: DismissalType) => {
    setPendingType(type)
    setPendingRuns(0)
    setPendingFielderId(undefined)
    if (type === 'Run Out') {
      setPendingOutId(null)
      setWicketStep('runout-who')
      return
    }
    const outId = innings.strikerId
    setPendingOutId(outId)
    if (NEEDS_FIELDER.has(type)) {
      setWicketStep('fielder')
    } else {
      decideNext(type, outId, 0, undefined)
    }
  }

  const scoreNonWicket = (kind: Exclude<BallKind, 'wicket'>, batRuns = 0, extraRuns = 0, byeRuns = 0) => {
    mutate(() => {
      const ball = makeBall(kind, {
        batRuns,
        extraRuns,
        byeRuns,
        strikerId: innings.strikerId,
        nonStrikerId: innings.nonStrikerId,
        bowlerId: innings.currentBowlerId,
        overNumber: currentOverIndex(innings),
      })
      addBall(innings, ball, m.oversLimit, maxWickets)
    })
    announce(describeNonWicketBall(kind, batRuns, extraRuns, byeRuns))
    setMode('normal')
  }

  const undo = () => {
    mutate(() => {
      undoLastBall(innings)
      replayPointers(innings)
    })
  }

  const endInningsEarly = () => {
    mutate(() => {
      innings.complete = true
    })
    setConfirmEnd(false)
  }

  const remaining = remainingBatsmen(match, inn)
  const bowlerChoices = eligibleBowlers(match, inn)
  const fielders = fieldingSidePlayers(match, inn)

  const strikerStat = inn.batsmen[inn.strikerId]
  const nonStrikerStat = inn.batsmen[inn.nonStrikerId]
  const bowlerStat = inn.bowlers[inn.currentBowlerId]

  return (
    <div className="mx-auto max-w-md px-4 pb-16" style={{ paddingTop: 'calc(1.25rem + var(--safe-top))' }}>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="text-[20px]" style={{ color: 'var(--text-secondary)' }}>
          ←
        </button>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {match.teamA.name} vs {match.teamB.name}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleVoice}
            className="text-[17px]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={voiceOn ? 'Mute ball-by-ball voice announcements' : 'Unmute ball-by-ball voice announcements'}
          >
            {voiceOn ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${match.teamA.name} vs ${match.teamB.name}? This can't be undone.`)) {
                deleteMatch(match.id)
                onBack()
              }
            }}
            className="text-[17px]"
            style={{ color: 'var(--wicket)' }}
            aria-label="Delete match"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="mb-4 flex rounded-xl p-1" style={{ background: 'var(--surface-card)' }}>
        {(['score', 'scorecard'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 text-[13px] font-semibold capitalize"
            style={{ background: tab === t ? 'var(--pitch)' : 'transparent', color: tab === t ? 'var(--pitch-ink)' : 'var(--text-secondary)' }}
          >
            {t === 'score' ? 'Scoring' : 'Scorecard'}
          </button>
        ))}
      </div>

      {match.status === 'completed' && (
        <div className="mb-4 rounded-2xl p-4 text-center text-white" style={{ background: 'var(--pitch)' }}>
          <div className="text-[17px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            {match.result}
          </div>
        </div>
      )}

      {tab === 'score' && (
        <>
          <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)' }}>
            <div className="mb-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              <b style={{ color: 'var(--text-primary)' }}>{battingTeamName}</b> batting · {bowlingTeamName} bowling
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[38px] font-bold" style={{ fontFamily: "'Oswald'" }}>
                {inn.runs}/{inn.wickets}
              </span>
              <span className="font-mono text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                ({oversDisplay(inn.legalBalls)}/{match.oversLimit} ov)
              </span>
            </div>
            {match.innings.length === 2 && (
              <div className="mt-2 border-t pt-2 text-[12.5px]" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}>
                Target <b style={{ color: 'var(--text-primary)' }}>{target(match)}</b> · need{' '}
                <b style={{ color: 'var(--text-primary)' }}>{Math.max(0, (target(match) ?? 0) - inn.runs)}</b> off{' '}
                <b style={{ color: 'var(--text-primary)' }}>{Math.max(0, match.oversLimit * 6 - inn.legalBalls)}</b> balls
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--surface-card)' }}>
                <div style={{ color: 'var(--text-muted)' }}>{playerName(match, inn.strikerId)}*</div>
                <div className="font-mono font-semibold">
                  {strikerStat?.runs ?? 0} ({strikerStat?.ballsFaced ?? 0})
                </div>
              </div>
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--surface-card)' }}>
                <div style={{ color: 'var(--text-muted)' }}>{playerName(match, inn.nonStrikerId)}</div>
                <div className="font-mono font-semibold">
                  {nonStrikerStat?.runs ?? 0} ({nonStrikerStat?.ballsFaced ?? 0})
                </div>
              </div>
            </div>
            <div className="mt-2 rounded-lg px-2.5 py-2 text-[13px]" style={{ background: 'var(--surface-card)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{playerName(match, inn.currentBowlerId)}: </span>
              <span className="font-mono font-semibold">
                {oversDisplay(bowlerStat?.legalBalls ?? 0)}-{bowlerStat?.maidens ?? 0}-{bowlerStat?.runsConceded ?? 0}-{bowlerStat?.wickets ?? 0}
              </span>
            </div>
          </div>

          {match.status === 'live' && !inn.complete && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {(inn.overs[currentOverIndex(inn)] ?? []).map((b, i) => (
                <BallChip key={i} kind={b.kind} totalRuns={b.totalRuns} wicket={b.wicket} />
              ))}
              {legalBallsThisOver(inn) === 0 && (inn.overs[currentOverIndex(inn)]?.length ?? 0) === 0 && (
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  New over
                </span>
              )}
            </div>
          )}

          {match.status === 'live' && !inn.complete && needsNewBowler && (
            <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--surface-card)' }}>
              <p className="mb-2 text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Over {Math.floor(inn.legalBalls / 6) + 1} — who's bowling?
              </p>
              <NameEntry
                knownPlayers={bowlerChoices}
                placeholder="Bowler name"
                onSubmit={(name) => {
                  const bowlingTeam = team(m, bowlingTeamKey(m, innings))
                  const id = resolveOrCreatePlayer(bowlingTeam, name)
                  if (id === innings.previousBowlerId) {
                    alert("That bowler just finished the previous over — pick someone else.")
                    return
                  }
                  mutate(() => {
                    innings.currentBowlerId = id
                  })
                }}
              />
            </div>
          )}

          {match.status === 'live' && !inn.complete && !needsNewBowler && (
            <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--surface-card)' }}>
              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                {(['normal', 'wide', 'noball', 'bye', 'legbye', 'wicket'] as BallKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => (k === 'wicket' ? setWicketStep('type') : (setMode(k), setWicketStep(null)))}
                    className="flex-shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-semibold"
                    style={{
                      background: mode === k || (k === 'wicket' && wicketStep) ? (k === 'wicket' ? 'var(--wicket)' : 'var(--text-primary)') : 'var(--surface-raised)',
                      color: mode === k || (k === 'wicket' && wicketStep) ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    {{ normal: 'Normal', wide: 'Wide', noball: 'No Ball', bye: 'Bye', legbye: 'Leg Bye', wicket: 'Wicket' }[k]}
                  </button>
                ))}
              </div>

              {mode === 'normal' && !wicketStep && (
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                    <button
                      key={r}
                      onClick={() => scoreNonWicket('normal', r)}
                      className="rounded-xl py-4 text-[18px] font-bold"
                      style={{
                        fontFamily: "'Oswald'",
                        background: r === 4 || r === 6 ? 'var(--pitch)' : 'var(--surface-raised)',
                        color: r === 4 || r === 6 ? 'var(--pitch-ink)' : 'var(--text-primary)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {mode === 'wide' && !wicketStep && (
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => scoreNonWicket('wide', 0, r)}
                      className="rounded-xl py-4 text-[15px] font-bold"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)' }}
                    >
                      {r === 0 ? 'Wd' : `Wd+${r}`}
                    </button>
                  ))}
                </div>
              )}

              {mode === 'noball' && !wicketStep && (
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                    <button
                      key={r}
                      onClick={() => scoreNonWicket('noball', r)}
                      className="rounded-xl py-4 text-[15px] font-bold"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)' }}
                    >
                      {r === 0 ? 'Nb' : `Nb+${r}`}
                    </button>
                  ))}
                </div>
              )}

              {(mode === 'bye' || mode === 'legbye') && !wicketStep && (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => scoreNonWicket(mode, 0, 0, r)}
                      className="rounded-xl py-4 text-[18px] font-bold"
                      style={{ fontFamily: "'Oswald'", background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)' }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {wicketStep === 'type' && (
                <div className="grid grid-cols-2 gap-2">
                  {DISMISSALS.map((d) => (
                    <button
                      key={d}
                      onClick={() => pickDismissalType(d)}
                      className="rounded-xl py-3 text-[13px] font-semibold"
                      style={{ background: 'var(--wicket-soft)', color: 'var(--wicket)' }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {wicketStep === 'runout-who' && (
                <div>
                  <p className="mb-2 text-[13.5px] font-semibold">Who's out?</p>
                  <div className="mb-3 flex gap-2">
                    {[inn.strikerId, inn.nonStrikerId].map((id) => (
                      <button
                        key={id}
                        onClick={() => setPendingOutId(id)}
                        className="flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold"
                        style={{
                          background: pendingOutId === id ? 'var(--wicket)' : 'var(--surface-raised)',
                          color: pendingOutId === id ? '#fff' : 'var(--text-primary)',
                          border: '1px solid var(--border-hairline)',
                        }}
                      >
                        {playerName(match, id)}
                      </button>
                    ))}
                  </div>
                  <p className="mb-2 text-[13.5px] font-semibold">Runs completed before the throw</p>
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((r) => (
                      <button
                        key={r}
                        onClick={() => setPendingRuns(r)}
                        className="rounded-xl py-2.5 text-[14px] font-bold"
                        style={{
                          background: pendingRuns === r ? 'var(--text-primary)' : 'var(--surface-raised)',
                          color: pendingRuns === r ? 'var(--surface-card)' : 'var(--text-primary)',
                          border: '1px solid var(--border-hairline)',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={!pendingOutId}
                    onClick={() => setWicketStep('fielder')}
                    className="w-full rounded-xl py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--wicket)' }}
                  >
                    Next
                  </button>
                </div>
              )}

              {wicketStep === 'fielder' && (
                <div>
                  <p className="mb-2 text-[13.5px] font-semibold">
                    Fielder {pendingFielderId ? `— ${playerName(m, pendingFielderId)}` : '(optional)'}
                  </p>
                  <NameEntry
                    knownPlayers={fielders}
                    placeholder="Fielder name"
                    buttonLabel="Set"
                    onSubmit={(name) => {
                      const fieldingTeam = team(m, bowlingTeamKey(m, innings))
                      setPendingFielderId(resolveOrCreatePlayer(fieldingTeam, name))
                    }}
                  />
                  <button
                    onClick={() => pendingType && pendingOutId && decideNext(pendingType, pendingOutId, pendingRuns, pendingFielderId)}
                    className="mt-3 w-full rounded-xl py-2.5 text-[14px] font-semibold text-white"
                    style={{ background: 'var(--wicket)' }}
                  >
                    Confirm wicket
                  </button>
                </div>
              )}

              {wicketStep === 'incoming' && (
                <div>
                  <p className="mb-2 text-[13.5px] font-semibold">Next batsman in</p>
                  <NameEntry
                    knownPlayers={remaining}
                    placeholder="Batsman name"
                    buttonLabel="In"
                    onSubmit={(name) => {
                      if (!pendingType || !pendingOutId) return
                      const battingTeam = team(m, innings.battingTeam)
                      const incomingId = resolveOrCreatePlayer(battingTeam, name)
                      commitWicketFinal(pendingType, pendingOutId, pendingRuns, pendingFielderId, incomingId)
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {match.status === 'live' && inn.complete && match.innings.length === 1 && (
            <SecondInningsPrompt match={match} />
          )}

          {match.status === 'live' && inn.complete && match.innings.length === 2 && (
            <button
              onClick={() => mutate(() => finishMatch(match))}
              className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white"
              style={{ background: 'var(--pitch)' }}
            >
              Finish match
            </button>
          )}

          {match.status === 'live' && !inn.complete && !needsNewBowler && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={undo}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', color: 'var(--text-secondary)' }}
              >
                ↶ Undo last ball
              </button>
              {confirmEnd ? (
                <button onClick={endInningsEarly} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white" style={{ background: 'var(--wicket)' }}>
                  Tap again to end innings
                </button>
              ) : (
                <button
                  onClick={() => setConfirmEnd(true)}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', color: 'var(--wicket)' }}
                >
                  End innings now
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'scorecard' && <Scorecard match={match} />}
    </div>
  )
}

function BallChip({ kind, totalRuns, wicket }: { kind: BallKind; totalRuns: number; wicket: boolean }) {
  let label = String(totalRuns)
  if (wicket) label = 'W'
  else if (kind === 'wide') label = totalRuns === 1 ? 'wd' : `wd+${totalRuns - 1}`
  else if (kind === 'noball') label = totalRuns === 1 ? 'nb' : `nb+${totalRuns - 1}`
  else if (kind === 'bye') label = `${totalRuns}b`
  else if (kind === 'legbye') label = `${totalRuns}lb`
  return (
    <span
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 font-mono text-[12px] font-semibold"
      style={{
        background: wicket ? 'var(--wicket-soft)' : kind !== 'normal' ? 'var(--extra-soft)' : totalRuns >= 4 ? 'var(--pitch)' : 'var(--surface-raised)',
        color: wicket ? 'var(--wicket)' : kind !== 'normal' ? 'var(--extra)' : totalRuns >= 4 ? 'var(--pitch-ink)' : 'var(--text-primary)',
        border: kind === 'normal' && totalRuns < 4 && !wicket ? '1px solid var(--border-hairline)' : 'none',
      }}
    >
      {label}
    </span>
  )
}

function SecondInningsPrompt({ match }: { match: Match }) {
  const bowlingKey = match.battingFirst === 'A' ? 'B' : 'A'
  const battingKey = match.battingFirst
  const nextBattingXI = team(match, bowlingKey).players // team that bowled first now bats
  const nextBowlingXI = team(match, battingKey).players
  const [strikerName, setStrikerName] = useState('')
  const [nonStrikerName, setNonStrikerName] = useState('')

  function start(bowlerName: string) {
    startSecondInnings(match, strikerName, nonStrikerName, bowlerName)
    writeMatch({ ...match, updatedAt: Date.now() })
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-card)' }}>
      <p className="mb-3 text-[14px] font-semibold">
        {team(match, bowlingKey).name} innings complete. Set up the 2nd innings — {team(match, bowlingKey).name} bat.
      </p>
      {!strikerName ? (
        <>
          <p className="mb-1.5 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Striker
          </p>
          <NameEntry knownPlayers={nextBattingXI} placeholder="Striker name" onSubmit={setStrikerName} />
        </>
      ) : !nonStrikerName ? (
        <>
          <p className="mb-1.5 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Striker: <b>{strikerName}</b> · Non-striker
          </p>
          <NameEntry
            knownPlayers={nextBattingXI.filter((p) => p.name !== strikerName)}
            placeholder="Non-striker name"
            onSubmit={setNonStrikerName}
          />
        </>
      ) : (
        <>
          <p className="mb-1.5 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {strikerName} &amp; {nonStrikerName} opening · Opening bowler
          </p>
          <NameEntry knownPlayers={nextBowlingXI} placeholder="Bowler name" buttonLabel="Start" onSubmit={start} />
        </>
      )}
    </div>
  )
}

function Scorecard({ match }: { match: Match }) {
  const [downloading, setDownloading] = useState(false)

  function exportCSV() {
    setDownloading(true)
    try {
      const csv = buildScorecardCSV(match)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${match.teamA.name}-vs-${match.teamB.name}-${new Date(match.createdAt).toISOString().slice(0, 10)}.csv`.replace(/\s+/g, '-')
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(match, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${match.teamA.name}-vs-${match.teamB.name}-${new Date(match.createdAt).toISOString().slice(0, 10)}.json`.replace(/\s+/g, '-')
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    setDownloading(true)
    try {
      const doc = buildScorecardPDF(match)
      doc.save(`${match.teamA.name}-vs-${match.teamB.name}-${new Date(match.createdAt).toISOString().slice(0, 10)}.pdf`.replace(/\s+/g, '-'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {match.innings.map((inn, idx) => (
        <div key={idx} className="rounded-2xl p-4" style={{ background: 'var(--surface-card)' }}>
          <h3 className="mb-3 text-[15px] font-bold" style={{ fontFamily: "'Oswald'" }}>
            {team(match, inn.battingTeam).name} — {inn.runs}/{inn.wickets} ({oversDisplay(inn.legalBalls)} ov)
          </h3>

          <table className="mb-3 w-full text-[12.5px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-1 text-left font-medium">Batting</th>
                <th className="pb-1 text-right font-medium">R</th>
                <th className="pb-1 text-right font-medium">B</th>
                <th className="pb-1 text-right font-medium">4s</th>
                <th className="pb-1 text-right font-medium">6s</th>
                <th className="pb-1 text-right font-medium">SR</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(inn.batsmen)
                .sort((a, b) => a.battingPosition - b.battingPosition)
                .map((b) => (
                  <tr key={b.playerId} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                    <td className="py-1.5">
                      <div className="font-medium">{playerName(match, b.playerId)}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {b.out
                          ? b.dismissal!.type === 'Run Out'
                            ? `run out${b.dismissal!.fielderId ? ' (' + playerName(match, b.dismissal!.fielderId) + ')' : ''}`
                            : `${b.dismissal!.type.toLowerCase()}${b.dismissal!.fielderId ? ' ' + playerName(match, b.dismissal!.fielderId) : ''}`
                          : b.playerId === inn.strikerId || b.playerId === inn.nonStrikerId
                            ? 'not out'
                            : ''}
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-mono font-semibold">{b.runs}</td>
                    <td className="py-1.5 text-right font-mono">{b.ballsFaced}</td>
                    <td className="py-1.5 text-right font-mono">{b.fours}</td>
                    <td className="py-1.5 text-right font-mono">{b.sixes}</td>
                    <td className="py-1.5 text-right font-mono">{strikeRate(b.runs, b.ballsFaced)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <table className="mb-3 w-full text-[12.5px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-1 text-left font-medium">Bowling</th>
                <th className="pb-1 text-right font-medium">O</th>
                <th className="pb-1 text-right font-medium">M</th>
                <th className="pb-1 text-right font-medium">R</th>
                <th className="pb-1 text-right font-medium">W</th>
                <th className="pb-1 text-right font-medium">Econ</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(inn.bowlers).map((bw) => (
                <tr key={bw.playerId} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <td className="py-1.5 font-medium">{playerName(match, bw.playerId)}</td>
                  <td className="py-1.5 text-right font-mono">{oversDisplay(bw.legalBalls)}</td>
                  <td className="py-1.5 text-right font-mono">{bw.maidens}</td>
                  <td className="py-1.5 text-right font-mono">{bw.runsConceded}</td>
                  <td className="py-1.5 text-right font-mono font-semibold">{bw.wickets}</td>
                  <td className="py-1.5 text-right font-mono">{economyRate(bw.runsConceded, bw.legalBalls)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {inn.fallOfWickets.length > 0 && (
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <b style={{ color: 'var(--text-secondary)' }}>Fall of wickets: </b>
              {inn.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${playerName(match, f.playerOutId)}, ${f.overBall} ov)`).join(', ')}
            </p>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={exportCSV} disabled={downloading} className="flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold" style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}>
          Export CSV
        </button>
        <button onClick={exportJSON} className="flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold" style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}>
          Export JSON
        </button>
        <button
          onClick={exportPDF}
          disabled={downloading}
          className="flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold text-white"
          style={{ background: 'var(--pitch)' }}
        >
          Export PDF
        </button>
      </div>
    </div>
  )
}
