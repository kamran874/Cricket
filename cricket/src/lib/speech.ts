import type { BallKind, DismissalType } from '../types'

const VOICE_KEY = 'cricket:voice'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== '0'
  } catch {
    return true
  }
}

let enabled = readEnabled()

export function isVoiceEnabled(): boolean {
  return enabled
}

export function setVoiceEnabled(value: boolean) {
  enabled = value
  try {
    localStorage.setItem(VOICE_KEY, value ? '1' : '0')
  } catch {
    // best-effort; voice preference just won't persist
  }
}

/** Speaks `text` aloud, replacing anything still queued so rapid taps don't
 *  pile up a backlog of stale announcements. */
export function announce(text: string) {
  if (!enabled) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.05
  window.speechSynthesis.speak(utterance)
}

const RUN_WORDS = ['Dot ball', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

export function describeNonWicketBall(kind: Exclude<BallKind, 'wicket'>, batRuns: number, extraRuns: number, byeRuns: number): string {
  switch (kind) {
    case 'wide':
      return extraRuns > 1 ? `Wide, plus ${extraRuns - 1}` : 'Wide'
    case 'noball':
      return batRuns > 0 ? `No ball, ${(RUN_WORDS[batRuns] ?? String(batRuns)).toLowerCase()}` : 'No ball'
    case 'bye':
      return `${byeRuns} ${byeRuns === 1 ? 'bye' : 'byes'}`
    case 'legbye':
      return `${byeRuns} leg ${byeRuns === 1 ? 'bye' : 'byes'}`
    default:
      return RUN_WORDS[batRuns] ?? String(batRuns)
  }
}

export function describeWicket(type: DismissalType): string {
  return `Wicket! ${type}`
}
