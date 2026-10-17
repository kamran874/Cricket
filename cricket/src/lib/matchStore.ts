import type { Match } from '../types'
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig'

export type Unsubscribe = () => void

export function newMatchId(): string {
  return crypto.randomUUID()
}

// ---------- recent-matches cache (always local — a personal shortcut list,
// never the source of truth for match content) ----------

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

// ---------- local backend (this device only) ----------

const LOCAL_EVENT = 'cricket:local-match-write'

function localKey(id: string) {
  return `cricket:match:${id}`
}

function localWriteMatch(match: Match) {
  localStorage.setItem(localKey(match.id), JSON.stringify(match))
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: match.id }))
}

function localReadMatch(id: string): Match | null {
  try {
    const raw = localStorage.getItem(localKey(id))
    return raw ? (JSON.parse(raw) as Match) : null
  } catch {
    return null
  }
}

function localWatchMatch(id: string, cb: (m: Match | null) => void): Unsubscribe {
  cb(localReadMatch(id))
  const onLocal = (e: Event) => {
    if ((e as CustomEvent).detail === id) cb(localReadMatch(id))
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === localKey(id)) cb(localReadMatch(id))
  }
  window.addEventListener(LOCAL_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(LOCAL_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

// ---------- Firestore backend (shared, live across devices) ----------

// Loaded lazily so a non-configured app never touches the Firebase SDK.
let firestorePromise: Promise<typeof import('firebase/firestore')> | null = null
let dbPromise: Promise<import('firebase/firestore').Firestore> | null = null

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp } = await import('firebase/app')
      firestorePromise = import('firebase/firestore')
      const { getFirestore, enableIndexedDbPersistence } = await firestorePromise
      const app = initializeApp(firebaseConfig)
      const db = getFirestore(app)
      try {
        await enableIndexedDbPersistence(db)
      } catch {
        // multiple tabs open, or browser doesn't support it — fine, just no offline cache
      }
      return db
    })()
  }
  return dbPromise
}

async function firestoreWriteMatch(match: Match) {
  const [db, fs] = await Promise.all([getDb(), firestorePromise!])
  await fs.setDoc(fs.doc(db, 'matches', match.id), match)
}

function firestoreWatchMatch(id: string, cb: (m: Match | null) => void): Unsubscribe {
  let unsub: Unsubscribe = () => {}
  let cancelled = false
  getDb().then(async (db) => {
    if (cancelled) return
    const fs = await firestorePromise!
    unsub = fs.onSnapshot(
      fs.doc(db, 'matches', id),
      (snap) => cb(snap.exists() ? (snap.data() as Match) : null),
      (err) => {
        console.error('match sync error', err)
        cb(null)
      },
    )
  })
  return () => {
    cancelled = true
    unsub()
  }
}

// ---------- unified API ----------

export function writeMatch(match: Match) {
  touchRecent(match)
  if (isFirebaseConfigured()) {
    firestoreWriteMatch(match).catch((err) => console.error('failed to sync match', err))
  } else {
    localWriteMatch(match)
  }
}

export function watchMatch(id: string, cb: (m: Match | null) => void): Unsubscribe {
  return isFirebaseConfigured() ? firestoreWatchMatch(id, cb) : localWatchMatch(id, cb)
}

export { isFirebaseConfigured }
