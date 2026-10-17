import { addBall, currentOverIndex, makeBall, newInnings, undoLastBall, replayPointers } from './engine'

let failures = 0
function assertEq(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    failures++
    console.error(`FAIL: ${msg}\n  expected: ${e}\n  actual:   ${a}`)
  } else {
    console.log(`ok: ${msg}`)
  }
}

const S = 's1' // striker
const N = 'n1' // non-striker
const B1 = 'b1'
const B2 = 'b2'
const sub1 = 'sub1'

// ---- Over with a mix of normal runs, a wide, a bye, ending with a wicket ----
{
  const inn = newInnings('A', S, N, B1)
  const over0 = () => currentOverIndex(inn)

  addBall(inn, makeBall('normal', { batRuns: 1, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: over0() }), 2, 10)
  assertEq(inn.runs, 1, 'single scores 1')
  assertEq(inn.strikerId, N, 'strike rotates on a single')
  assertEq(inn.legalBalls, 1, 'legal ball count after a single')

  addBall(inn, makeBall('wide', { extraRuns: 0, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: over0() }), 2, 10)
  assertEq(inn.runs, 2, 'plain wide adds 1')
  assertEq(inn.legalBalls, 1, 'wide does not count as a legal ball')

  addBall(inn, makeBall('bye', { byeRuns: 2, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: over0() }), 2, 10)
  assertEq(inn.runs, 4, '2 byes add to team total')
  assertEq(inn.legalBalls, 2, 'bye counts as a legal ball')
  const bowler1 = inn.bowlers[B1]
  assertEq(bowler1.runsConceded, 2, 'byes are NOT charged to the bowler (only the 1-run single + 1-run wide count, not the 2 byes)')

  addBall(inn, makeBall('normal', { batRuns: 4, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: over0() }), 2, 10)
  assertEq(inn.runs, 8, 'four scores 4')
  const strikerAfterFour = inn.strikerId
  assertEq(inn.batsmen[strikerAfterFour].fours, 1, 'four is tallied for the striker')

  // ball 4 legal (the bye was legal ball #2, this four is legal ball #3). Bowl 3 more legal dots to finish the over.
  addBall(inn, makeBall('normal', { batRuns: 0, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: over0() }), 2, 10)
  addBall(inn, makeBall('normal', { batRuns: 0, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: over0() }), 2, 10)
  const strikerBeforeLastBall = inn.strikerId
  const nonStrikerBeforeLastBall = inn.nonStrikerId
  addBall(
    inn,
    makeBall('wicket', {
      batRuns: 0,
      dismissal: { type: 'Bowled', batsmanOutId: strikerBeforeLastBall, incomingBatsmanId: sub1 },
      strikerId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: B1,
      overNumber: over0(),
    }),
    2,
    10,
  )
  assertEq(inn.wickets, 1, 'one wicket recorded')
  assertEq(inn.legalBalls, 6, 'over 1 complete at 6 legal balls')
  assertEq(inn.overs.length, 1, 'still exactly one over array after its 6th ball')
  // dismissed striker is replaced by sub1, then end-of-over swap flips ends
  assertEq(inn.nonStrikerId, sub1, 'incoming batsman takes the dismissed striker\'s end, then over-end swap puts them non-strike')
  assertEq(inn.strikerId, nonStrikerBeforeLastBall, 'the not-out batsman rotates onto strike for the new over')
  assertEq(inn.bowlers[B1].wickets, 1, 'bowled is credited to the bowler')
  assertEq(inn.fallOfWickets.length, 1, 'one fall-of-wicket entry')
  assertEq(inn.fallOfWickets[0].score, 8, 'fall of wicket recorded at team score 8')
}

// ---- No-ball: penalty + bat runs, does not count as a legal ball or a ball faced ----
{
  const inn = newInnings('A', S, N, B1)
  addBall(inn, makeBall('noball', { batRuns: 4, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: 0 }), 20, 10)
  assertEq(inn.runs, 5, 'no-ball: 1 penalty + 4 off the bat = 5')
  assertEq(inn.legalBalls, 0, 'no-ball does not count toward the over')
  assertEq(inn.batsmen[S].runs, 4, 'the 4 is credited to the batsman')
  assertEq(inn.batsmen[S].ballsFaced, 0, 'a no-ball is not counted as a ball faced')
  assertEq(inn.bowlers[B1].runsConceded, 5, 'bowler is charged the full 5')
}

// ---- Maiden over ----
{
  const inn = newInnings('A', S, N, B1)
  for (let i = 0; i < 6; i++) {
    addBall(inn, makeBall('normal', { batRuns: 0, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: 0 }), 20, 10)
  }
  assertEq(inn.bowlers[B1].maidens, 1, 'six dot balls is a maiden')
}

// ---- Run-out of the non-striker, with runs completed before the throw ----
{
  const inn = newInnings('A', S, N, B1)
  const strikerBefore = inn.strikerId
  const nonStrikerBefore = inn.nonStrikerId
  addBall(
    inn,
    makeBall('wicket', {
      batRuns: 1,
      dismissal: { type: 'Run Out', batsmanOutId: nonStrikerBefore, fielderId: 'f1', incomingBatsmanId: sub1 },
      strikerId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: B1,
      overNumber: 0,
    }),
    20,
    10,
  )
  assertEq(inn.runs, 1, 'the completed run before the run-out counts')
  assertEq(inn.wickets, 1, 'one wicket')
  assertEq(inn.bowlers[B1].wickets, 0, 'run-out is NOT credited to the bowler')
  // 1 run = odd -> parity swap puts original striker at non-strike end, original non-striker (now out) at strike end -> replaced by sub1
  assertEq(inn.strikerId, sub1, 'incoming batsman takes the dismissed (out) batsman\'s end')
  assertEq(inn.nonStrikerId, strikerBefore, 'the not-out original striker ends up non-striker after the run')
}

// ---- Undo across an over boundary restores exact prior state ----
{
  const inn = newInnings('A', S, N, B1)
  for (let i = 0; i < 6; i++) {
    addBall(inn, makeBall('normal', { batRuns: 1, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: currentOverIndex(inn) }), 20, 10)
  }
  inn.currentBowlerId = B2 // user picks a new bowler for over 2
  addBall(inn, makeBall('normal', { batRuns: 2, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B2, overNumber: currentOverIndex(inn) }), 20, 10)
  assertEq(inn.runs, 8, 'runs before undo')
  undoLastBall(inn)
  replayPointers(inn)
  assertEq(inn.runs, 6, 'runs after undoing the 7th ball')
  assertEq(inn.overs.length, 1, 'back down to a single over array')
  assertEq(inn.legalBalls, 6, 'legal balls back to 6')
}

// ---- Innings completes at overs limit ----
{
  const inn = newInnings('A', S, N, B1)
  for (let o = 0; o < 2; o++) {
    for (let i = 0; i < 6; i++) {
      addBall(inn, makeBall('normal', { batRuns: 0, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: currentOverIndex(inn) }), 2, 10)
    }
  }
  assertEq(inn.complete, true, 'innings marked complete at the overs limit')
}

// ---- A chase ends the instant the target is passed, mid-over, not at over/innings end ----
{
  const inn = newInnings('B', S, N, B1)
  const target = 23 // chasing a first-innings score of 22
  addBall(inn, makeBall('normal', { batRuns: 4, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: currentOverIndex(inn) }), 20, 10, target)
  assertEq(inn.complete, false, 'not complete yet: 4 runs, nowhere near the target')

  for (let i = 0; i < 4; i++) {
    addBall(inn, makeBall('normal', { batRuns: 4, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: currentOverIndex(inn) }), 20, 10, target)
  }
  // 5 fours = 20 runs, still short of the 23 target, and only the 5th ball of the over
  assertEq(inn.runs, 20, 'score after five fours')
  assertEq(inn.complete, false, 'still not complete: target not yet reached')

  addBall(inn, makeBall('normal', { batRuns: 4, strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: B1, overNumber: currentOverIndex(inn) }), 20, 10, target)
  // the 6th ball's four takes the score to 24, past the 23 target, mid-over (only 6 of 120 legal balls bowled)
  assertEq(inn.runs, 24, 'score after the chase-winning four')
  assertEq(inn.complete, true, 'innings ends immediately once the target is passed, even mid-over with 19 overs still unbowled')
}

console.log(failures === 0 ? '\nALL ASSERTIONS PASSED' : `\n${failures} ASSERTION(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
