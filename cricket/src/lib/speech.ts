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

/** On several mobile browsers (notably iOS Safari), the first speak() call
 *  right after page load silently does nothing if it fires before the voice
 *  list has finished loading — a well-known cross-browser quirk. Waiting for
 *  `voiceschanged` (with a short fallback timeout, since some browsers never
 *  fire it) avoids that race. Resolved once and cached for the whole session. */
let voicesReady: Promise<void> | null = null
function ensureVoicesReady(): Promise<void> {
  if (voicesReady) return voicesReady
  voicesReady = new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve()
      return
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve()
      return
    }
    const onReady = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onReady)
      resolve()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onReady)
    setTimeout(resolve, 300)
  })
  return voicesReady
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Kick off voice loading as early as possible, well before the splash
  // screen's first announce() call needs it.
  window.speechSynthesis.getVoices()
}

/** Speaks `text` aloud, replacing anything still queued so rapid taps don't
 *  pile up a backlog of stale announcements. */
export function announce(text: string) {
  if (!enabled) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  ensureVoicesReady().then(() => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    window.speechSynthesis.speak(utterance)
  })
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
