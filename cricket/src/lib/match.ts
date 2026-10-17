import { newInnings, oversDisplay } from './engine'
import type { Innings, Match, Player, TeamKey, TeamSetup } from '../types'

export function opposingKey(key: TeamKey): TeamKey {
  return key === 'A' ? 'B' : 'A'
}

export function team(match: Match, key: TeamKey): TeamSetup {
  return key === 'A' ? match.teamA : match.teamB
}

export function playerName(match: Match, playerId: string): string {
  const p =
    match.teamA.players.find((x) => x.id === playerId) ?? match.teamB.players.find((x) => x.id === playerId)
  return p?.name ?? 'Unknown'
}

export function currentInnings(match: Match): Innings {
  return match.innings[match.innings.length - 1]
}

export function bowlingTeamKey(_match: Match, innings: Innings): TeamKey {
  return opposingKey(innings.battingTeam)
}

/** Finds a player by name (case-insensitive) on `team`, or creates one —
 *  the single source of truth for turning a typed/tapped name into a stable
 *  player id, so the same person's stats always accumulate under one id. */
export function resolveOrCreatePlayer(team: TeamSetup, rawName: string): string {
  const name = rawName.trim()
  const existing = team.players.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (existing) return existing.id
  const id = crypto.randomUUID()
  team.players.push({ id, name })
  return id
}

export function createMatch(input: {
  teamAName: string
  teamBName: string
  oversLimit: number
  playersPerSide: number
  tossWinner: TeamKey
  tossDecision: 'bat' | 'bowl'
  openingStrikerName: string
  openingNonStrikerName: string
  openingBowlerName: string
}): Match {
  const battingFirst = input.tossDecision === 'bat' ? input.tossWinner : opposingKey(input.tossWinner)
  const teamA: TeamSetup = { name: input.teamAName, players: [] }
  const teamB: TeamSetup = { name: input.teamBName, players: [] }
  const battingTeam = battingFirst === 'A' ? teamA : teamB
  const bowlingTeam = battingFirst === 'A' ? teamB : teamA
  const strikerId = resolveOrCreatePlayer(battingTeam, input.openingStrikerName)
  const nonStrikerId = resolveOrCreatePlayer(battingTeam, input.openingNonStrikerName)
  const bowlerId = resolveOrCreatePlayer(bowlingTeam, input.openingBowlerName)
  return {
    id: crypto.randomUUID(),
    teamA,
    teamB,
    oversLimit: input.oversLimit,
    playersPerSide: input.playersPerSide,
    tossWinner: input.tossWinner,
    tossDecision: input.tossDecision,
    battingFirst,
    status: 'live',
    result: null,
    innings: [newInnings(battingFirst, strikerId, nonStrikerId, bowlerId)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function startSecondInnings(match: Match, strikerName: string, nonStrikerName: string, bowlerName: string) {
  const battingKey = opposingKey(match.battingFirst)
  const battingTeam = team(match, battingKey)
  const bowlingTeam = team(match, opposingKey(battingKey))
  const strikerId = resolveOrCreatePlayer(battingTeam, strikerName)
  const nonStrikerId = resolveOrCreatePlayer(battingTeam, nonStrikerName)
  const bowlerId = resolveOrCreatePlayer(bowlingTeam, bowlerName)
  match.innings.push(newInnings(battingKey, strikerId, nonStrikerId, bowlerId))
}

export function target(match: Match): number | null {
  if (match.innings.length < 2) return null
  return match.innings[0].runs + 1
}

export function finishMatch(match: Match) {
  const i1 = match.innings[0]
  const i2 = match.innings[1]
  const t1 = team(match, i1.battingTeam)
  const t2 = team(match, i2.battingTeam)
  let result: string
  if (i2.runs > i1.runs) {
    const maxWickets = match.playersPerSide - 1
    const wicketsLeft = maxWickets - i2.wickets
    result = `${t2.name} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`
  } else if (i1.runs > i2.runs) {
    result = `${t1.name} won by ${i1.runs - i2.runs} run${i1.runs - i2.runs === 1 ? '' : 's'}`
  } else {
    result = 'Match tied'
  }
  match.status = 'completed'
  match.result = result
}

export function remainingBatsmen(match: Match, innings: Innings): Player[] {
  const battingTeam = team(match, innings.battingTeam)
  const unavailable = new Set([
    innings.strikerId,
    innings.nonStrikerId,
    ...Object.values(innings.batsmen)
      .filter((b) => b.out)
      .map((b) => b.playerId),
  ])
  return battingTeam.players.filter((p) => !unavailable.has(p.id))
}

/** No bowler may send down more than 1/5th of the innings' overs (the
 *  standard limited-overs rule — e.g. 4 of 20, 10 of 50), rounded up. */
export function maxOversPerBowler(oversLimit: number): number {
  return Math.ceil(oversLimit / 5)
}

export function eligibleBowlers(match: Match, innings: Innings): Player[] {
  const bowlingTeam = team(match, bowlingTeamKey(match, innings))
  const cap = maxOversPerBowler(match.oversLimit)
  return bowlingTeam.players.filter((p) => {
    if (p.id === innings.previousBowlerId) return false
    const legalBalls = innings.bowlers[p.id]?.legalBalls ?? 0
    return Math.floor(legalBalls / 6) < cap
  })
}

export function fieldingSidePlayers(match: Match, innings: Innings): Player[] {
  return team(match, bowlingTeamKey(match, innings)).players
}

function csvEsc(s: unknown): string {
  const str = String(s ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}
function csvRow(arr: unknown[]): string {
  return arr.map(csvEsc).join(',')
}

export function buildScorecardCSV(match: Match): string {
  const lines: string[] = []
  lines.push(csvRow(['Star Kala CC — Match Scorecard']))
  lines.push(csvRow([match.teamA.name, 'vs', match.teamB.name]))
  lines.push(csvRow(['Overs', match.oversLimit, 'Toss', `${team(match, match.tossWinner).name} won, chose to ${match.tossDecision}`]))
  lines.push(csvRow(['Result', match.result ?? 'In progress']))
  lines.push('')

  for (const innings of match.innings) {
    const battingTeamName = team(match, innings.battingTeam).name
    lines.push(csvRow([`${battingTeamName} innings — ${innings.runs}/${innings.wickets} (${oversDisplay(innings.legalBalls)} ov)`]))
    lines.push('')
    lines.push(csvRow(['Batting', 'Status', 'R', 'B', '4s', '6s', 'SR']))
    const battingOrder = Object.values(innings.batsmen).sort((a, b) => a.battingPosition - b.battingPosition)
    for (const b of battingOrder) {
      const status = b.out
        ? b.dismissal!.type === 'Run Out'
          ? `run out (${b.dismissal!.fielderId ? playerName(match, b.dismissal!.fielderId) : '?'})`
          : `${b.dismissal!.type.toLowerCase()}${b.dismissal!.fielderId ? ' ' + playerName(match, b.dismissal!.fielderId) : ''}`
        : b.playerId === innings.strikerId || b.playerId === innings.nonStrikerId
          ? 'not out'
          : 'retired'
      const sr = b.ballsFaced === 0 ? '0.0' : ((b.runs / b.ballsFaced) * 100).toFixed(1)
      lines.push(csvRow([playerName(match, b.playerId), status, b.runs, b.ballsFaced, b.fours, b.sixes, sr]))
    }
    const extrasRuns = innings.runs - Object.values(innings.batsmen).reduce((s, b) => s + b.runs, 0)
    lines.push(csvRow(['Extras', '', extrasRuns]))
    lines.push(csvRow(['Total', '', innings.runs, '', '', '', `${innings.wickets} wkt(s), ${oversDisplay(innings.legalBalls)} ov`]))
    lines.push('')
    lines.push(csvRow(['Bowling', 'O', 'M', 'R', 'W', 'Econ']))
    for (const bw of Object.values(innings.bowlers)) {
      const econ = bw.legalBalls === 0 ? '0.00' : (bw.runsConceded / (bw.legalBalls / 6)).toFixed(2)
      lines.push(csvRow([playerName(match, bw.playerId), oversDisplay(bw.legalBalls), bw.maidens, bw.runsConceded, bw.wickets, econ]))
    }
    lines.push('')
    if (innings.fallOfWickets.length) {
      lines.push(
        csvRow([
          'Fall of wickets',
          innings.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${playerName(match, f.playerOutId)}, ${f.overBall} ov)`).join('; '),
        ]),
      )
      lines.push('')
    }
  }
  return lines.join('\n')
}
