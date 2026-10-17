export type TeamKey = 'A' | 'B'

export interface Player {
  id: string
  name: string
}

export interface TeamSetup {
  name: string
  players: Player[]
}

export type DismissalType =
  | 'Bowled'
  | 'Caught'
  | 'LBW'
  | 'Run Out'
  | 'Stumped'
  | 'Hit Wicket'
  | 'Retired Out'
  | 'Obstructing the Field'

export const BOWLER_CREDITED_DISMISSALS: ReadonlySet<DismissalType> = new Set([
  'Bowled',
  'Caught',
  'LBW',
  'Stumped',
  'Hit Wicket',
])

export type BallKind = 'normal' | 'wide' | 'noball' | 'bye' | 'legbye' | 'wicket'

export interface Dismissal {
  type: DismissalType
  batsmanOutId: string
  fielderId?: string
  /** The batsman who came in to replace batsmanOutId, if the innings continued. */
  incomingBatsmanId?: string
}

export interface BallEvent {
  id: string
  kind: BallKind
  legal: boolean
  batRuns: number // credited to striker personally
  extraRuns: number // wide/no-ball penalty + additional run-while-illegal component
  byeRuns: number // bye/leg-bye runs
  totalRuns: number // everything added to team score this ball
  wicket: boolean
  dismissal?: Dismissal
  strikerId: string
  nonStrikerId: string
  bowlerId: string
  overNumber: number // 0-indexed over this ball belongs to
}

export interface BatsmanStat {
  playerId: string
  runs: number
  ballsFaced: number
  fours: number
  sixes: number
  out: boolean
  dismissal?: Dismissal
  battingPosition: number
}

export interface BowlerStat {
  playerId: string
  legalBalls: number
  runsConceded: number
  wickets: number
  maidens: number
}

export interface FallOfWicket {
  wicketNumber: number
  playerOutId: string
  score: number
  overBall: string
}

export interface Innings {
  battingTeam: TeamKey
  /** The two openers, fixed at innings start. Every later batsman is derived
   *  from dismissal.incomingBatsmanId while replaying `overs`. */
  openers: [string, string]
  overs: BallEvent[][]
  /** Live pointers — not derivable from history, since they describe what
   *  happens NEXT. Everything else below is derived by replaying `overs`. */
  strikerId: string
  nonStrikerId: string
  currentBowlerId: string
  previousBowlerId: string | null
  complete: boolean
  // --- derived/cached by recomputeInnings(), safe to regenerate anytime ---
  batsmen: Record<string, BatsmanStat>
  bowlers: Record<string, BowlerStat>
  runs: number
  wickets: number
  legalBalls: number
  fallOfWickets: FallOfWicket[]
}

export interface Match {
  id: string
  teamA: TeamSetup
  teamB: TeamSetup
  oversLimit: number
  tossWinner: TeamKey
  tossDecision: 'bat' | 'bowl'
  battingFirst: TeamKey
  status: 'live' | 'completed'
  result: string | null
  innings: Innings[]
  createdAt: number
  updatedAt: number
}
