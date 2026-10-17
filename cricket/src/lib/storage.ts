import type { Match } from '../types'

const KEY = 'cricket:matches'

export function getMatches(): Match[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Match[]) : []
  } catch {
    return []
  }
}

export function saveMatches(matches: Match[]) {
  localStorage.setItem(KEY, JSON.stringify(matches))
}

export function upsertMatch(match: Match) {
  const all = getMatches()
  const idx = all.findIndex((m) => m.id === match.id)
  if (idx >= 0) all[idx] = match
  else all.unshift(match)
  saveMatches(all)
}

export function deleteMatch(id: string) {
  saveMatches(getMatches().filter((m) => m.id !== id))
}
