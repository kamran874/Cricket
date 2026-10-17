import {
  BOWLER_CREDITED_DISMISSALS,
  type BallEvent,
  type BallKind,
  type BatsmanStat,
  type BowlerStat,
  type Dismissal,
  type FallOfWicket,
  type Innings,
} from '../types'

export function newInnings(
  battingTeam: 'A' | 'B',
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
): Innings {
  const innings: Innings = {
    battingTeam,
    openers: [strikerId, nonStrikerId],
    overs: [],
    strikerId,
    nonStrikerId,
    currentBowlerId: bowlerId,
    previousBowlerId: null,
    complete: false,
    batsmen: {},
    bowlers: {},
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    fallOfWickets: [],
  }
  recomputeInnings(innings)
  return innings
}

function isOverComplete(over: BallEvent[]): boolean {
  return over.filter((b) => b.legal).length >= 6
}

export function makeBall(
  kind: BallKind,
  opts: {
    batRuns?: number
    extraRuns?: number
    byeRuns?: number
    dismissal?: Dismissal
    strikerId: string
    nonStrikerId: string
    bowlerId: string
    overNumber: number
  },
): BallEvent {
  const batRuns = opts.batRuns ?? 0
  const extraRuns = opts.extraRuns ?? 0
  const byeRuns = opts.byeRuns ?? 0
  const base = {
    id: crypto.randomUUID(),
    strikerId: opts.strikerId,
    nonStrikerId: opts.nonStrikerId,
    bowlerId: opts.bowlerId,
    overNumber: opts.overNumber,
    wicket: !!opts.dismissal,
    dismissal: opts.dismissal,
  }
  switch (kind) {
    case 'normal':
      return { ...base, kind, legal: true, batRuns, extraRuns: 0, byeRuns: 0, totalRuns: batRuns }
    case 'wide':
      return { ...base, kind, legal: false, batRuns: 0, extraRuns: 1 + extraRuns, byeRuns: 0, totalRuns: 1 + extraRuns }
    case 'noball':
      return { ...base, kind, legal: false, batRuns, extraRuns: 1, byeRuns: 0, totalRuns: 1 + batRuns }
    case 'bye':
      return { ...base, kind, legal: true, batRuns: 0, extraRuns: 0, byeRuns, totalRuns: byeRuns }
    case 'legbye':
      return { ...base, kind, legal: true, batRuns: 0, extraRuns: 0, byeRuns, totalRuns: byeRuns }
    case 'wicket':
      return { ...base, kind, legal: true, batRuns, extraRuns: 0, byeRuns: 0, totalRuns: batRuns }
  }
}

/** Runs physically run between the wickets this ball (determines strike rotation). */
function runsRunBetweenWickets(ball: BallEvent): number {
  if (ball.kind === 'wide') return ball.extraRuns - 1 // the 1 is the auto-penalty, not a run
  if (ball.kind === 'normal' || ball.kind === 'noball') return ball.batRuns
  if (ball.kind === 'bye' || ball.kind === 'legbye') return ball.byeRuns
  if (ball.kind === 'wicket') return ball.batRuns
  return 0
}

export function addBall(innings: Innings, ball: BallEvent, oversLimit: number, maxWickets: number, target?: number) {
  const overIdx = ball.overNumber
  while (innings.overs.length <= overIdx) innings.overs.push([])
  innings.overs[overIdx].push(ball)

  // advance live pointers
  const rotates = runsRunBetweenWickets(ball) % 2 === 1
  if (rotates) {
    const tmp = innings.strikerId
    innings.strikerId = innings.nonStrikerId
    innings.nonStrikerId = tmp
  }
  if (ball.wicket && ball.dismissal?.incomingBatsmanId) {
    if (ball.dismissal.batsmanOutId === innings.strikerId) {
      innings.strikerId = ball.dismissal.incomingBatsmanId
    } else {
      innings.nonStrikerId = ball.dismissal.incomingBatsmanId
    }
  }
  if (ball.legal && isOverComplete(innings.overs[overIdx])) {
    const tmp = innings.strikerId
    innings.strikerId = innings.nonStrikerId
    innings.nonStrikerId = tmp
    innings.previousBowlerId = innings.currentBowlerId
  }

  recomputeInnings(innings)
  innings.complete =
    innings.legalBalls >= oversLimit * 6 ||
    innings.wickets >= maxWickets ||
    (target !== undefined && innings.runs >= target) ||
    innings.complete
}

export function undoLastBall(innings: Innings): boolean {
  let overIdx = innings.overs.length - 1
  while (overIdx >= 0 && innings.overs[overIdx].length === 0) {
    innings.overs.pop()
    overIdx--
  }
  if (overIdx < 0) return false
  innings.overs[overIdx].pop()
  if (innings.overs[overIdx].length === 0) innings.overs.pop()
  recomputeInnings(innings)
  // live pointers (striker/non-striker/bowler) are rebuilt by the caller via
  // replayPointers(), since undo can cross a wicket or over boundary.
  innings.complete = false
  return true
}

/** Rebuilds strikerId/nonStrikerId/currentBowlerId/previousBowlerId purely by
 *  replaying every ball in order. Call after undo(); not needed after addBall(). */
export function replayPointers(innings: Innings) {
  let striker = innings.openers[0]
  let nonStriker = innings.openers[1]
  let currentBowler: string | null = null
  let previousBowler: string | null = null

  for (const over of innings.overs) {
    for (const ball of over) {
      currentBowler = ball.bowlerId
      const rotates = runsRunBetweenWickets(ball) % 2 === 1
      if (rotates) [striker, nonStriker] = [nonStriker, striker]
      if (ball.wicket && ball.dismissal?.incomingBatsmanId) {
        if (ball.dismissal.batsmanOutId === striker) striker = ball.dismissal.incomingBatsmanId
        else nonStriker = ball.dismissal.incomingBatsmanId
      }
    }
    if (over.length && isOverComplete(over)) {
      ;[striker, nonStriker] = [nonStriker, striker]
      previousBowler = currentBowler
    }
  }
  innings.strikerId = striker
  innings.nonStrikerId = nonStriker
  if (currentBowler) innings.currentBowlerId = currentBowler
  innings.previousBowlerId = previousBowler
}

function emptyBatsman(playerId: string, position: number): BatsmanStat {
  return { playerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, out: false, battingPosition: position }
}
function emptyBowler(playerId: string): BowlerStat {
  return { playerId, legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
}

/** The single source of truth: derives runs/wickets/legalBalls, every
 *  batsman's and bowler's figures, and the fall-of-wickets list, purely by
 *  replaying `overs` from `openers`. Safe to call after any mutation. */
export function recomputeInnings(innings: Innings) {
  const batsmen: Record<string, BatsmanStat> = {}
  const bowlers: Record<string, BowlerStat> = {}
  const fallOfWickets: FallOfWicket[] = []
  let runs = 0
  let wickets = 0
  let legalBalls = 0
  let position = 0

  const ensureBatsman = (id: string) => {
    if (!batsmen[id]) batsmen[id] = emptyBatsman(id, position++)
    return batsmen[id]
  }
  const ensureBowler = (id: string) => {
    if (!bowlers[id]) bowlers[id] = emptyBowler(id)
    return bowlers[id]
  }

  ensureBatsman(innings.openers[0])
  ensureBatsman(innings.openers[1])

  for (const over of innings.overs) {
    let overRuns = 0
    let overHadExtra = false
    for (const ball of over) {
      runs += ball.totalRuns
      overRuns += ball.totalRuns
      if (ball.kind === 'wide' || ball.kind === 'noball') overHadExtra = true
      if (ball.legal) legalBalls++

      const bowler = ensureBowler(ball.bowlerId)
      if (ball.legal) bowler.legalBalls++
      // byes/leg-byes are not charged to the bowler; everything else is
      if (ball.kind !== 'bye' && ball.kind !== 'legbye') bowler.runsConceded += ball.totalRuns

      if (ball.kind === 'normal' || ball.kind === 'noball' || ball.kind === 'wicket') {
        const striker = ensureBatsman(ball.strikerId)
        striker.runs += ball.batRuns
        if (ball.batRuns === 4) striker.fours++
        if (ball.batRuns === 6) striker.sixes++
        if (ball.kind !== 'noball') striker.ballsFaced++
      }

      if (ball.wicket && ball.dismissal) {
        wickets++
        const out = ensureBatsman(ball.dismissal.batsmanOutId)
        out.out = true
        out.dismissal = ball.dismissal
        if (BOWLER_CREDITED_DISMISSALS.has(ball.dismissal.type)) bowler.wickets++
        fallOfWickets.push({
          wicketNumber: wickets,
          playerOutId: ball.dismissal.batsmanOutId,
          score: runs,
          overBall: `${ball.overNumber}.${over.filter((b) => b.legal).indexOf(ball) + 1}`,
        })
        if (ball.dismissal.incomingBatsmanId) ensureBatsman(ball.dismissal.incomingBatsmanId)
      }
    }
    if (over.length && isOverComplete(over) && overRuns === 0 && !overHadExtra) {
      ensureBowler(over[0].bowlerId).maidens++
    }
  }

  innings.batsmen = batsmen
  innings.bowlers = bowlers
  innings.fallOfWickets = fallOfWickets
  innings.runs = runs
  innings.wickets = wickets
  innings.legalBalls = legalBalls
}

/** Which over index the next ball should be recorded under. */
export function currentOverIndex(innings: Innings): number {
  const last = innings.overs[innings.overs.length - 1]
  if (!last || isOverComplete(last)) return innings.overs.length
  return innings.overs.length - 1
}

export function legalBallsThisOver(innings: Innings): number {
  const idx = currentOverIndex(innings)
  const over = innings.overs[idx]
  return over ? over.filter((b) => b.legal).length : 0
}

export function isNewOverStarting(innings: Innings): boolean {
  return legalBallsThisOver(innings) === 0
}

export function oversDisplay(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

export function economyRate(runsConceded: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00'
  return (runsConceded / (legalBalls / 6)).toFixed(2)
}

export function strikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.0'
  return ((runs / balls) * 100).toFixed(1)
}
