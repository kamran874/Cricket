import type { Match } from '../types'

export type Unsubscribe = () => void

export function newMatchId(): string {
  return crypto.randomUUID()
}

// ---------- recent-matches cache (a personal shortcut list for Home) ----------

export interface RecentEntry {
  id: string
  teamA: string
  teamB: string
  status: 'live' | 'completed'
  result: string | null
  updatedAt: number
}

const RECENT_KEY = 'cricket:recent'

export function getRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list: RecentEntry[] = raw ? JSON.parse(raw) : []
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function touchRecent(match: Match) {
  try {
    const list = getRecent().filter((e) => e.id !== match.id)
    list.unshift({
      id: match.id,
      teamA: match.teamA.name,
      teamB: match.teamB.name,
      status: match.status,
      result: match.result,
      updatedAt: match.updatedAt,
    })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 50)))
  } catch {
    // best-effort cache; ignore quota/availability errors
  }
}

export function removeFromRecent(id: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter((e) => e.id !== id)))
}

// ---------- match storage (this device only — works fully offline) ----------

const LOCAL_EVENT = 'cricket:local-match-write'

function localKey(id: string) {
  return `cricket:match:${id}`
}

function readMatch(id: string): Match | null {
  try {
    const raw = localStorage.getItem(localKey(id))
    return raw ? (JSON.parse(raw) as Match) : null
  } catch {
    return null
  }
}

export function writeMatch(match: Match) {
  touchRecent(match)
  localStorage.setItem(localKey(match.id), JSON.stringify(match))
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: match.id }))
}

/** `cb` fires immediately with the current value, then again whenever this
 *  match is written — from this tab (custom event) or another tab/window on
 *  the same device (the native `storage` event). Everything here is plain
 *  localStorage, so it works with no network at all. */
export function watchMatch(id: string, cb: (m: Match | null) => void): Unsubscribe {
  cb(readMatch(id))
  const onLocal = (e: Event) => {
    if ((e as CustomEvent).detail === id) cb(readMatch(id))
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === localKey(id)) cb(readMatch(id))
  }
  window.addEventListener(LOCAL_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(LOCAL_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}
