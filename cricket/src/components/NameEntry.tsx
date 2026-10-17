import { useState } from 'react'
import type { Player } from '../types'

/** Tap a previously-used name as a chip, or type a new one — the single
 *  pattern for every in-match player prompt (incoming batsman, new bowler,
 *  fielder, next innings' openers), so nobody has to pre-enter a full XI. */
export function NameEntry({
  knownPlayers,
  onSubmit,
  placeholder = 'Player name',
  buttonLabel = 'Add',
}: {
  knownPlayers: Player[]
  onSubmit: (name: string) => void
  placeholder?: string
  buttonLabel?: string
}) {
  const [text, setText] = useState('')

  function submitText() {
    const name = text.trim()
    if (!name) return
    onSubmit(name)
    setText('')
  }

  return (
    <div>
      {knownPlayers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {knownPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => onSubmit(p.name)}
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitText()}
          placeholder={placeholder}
          className="flex-1 rounded-xl px-3 py-2 text-[14px] outline-none"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
        />
        <button
          onClick={submitText}
          className="rounded-xl px-4 text-[13.5px] font-semibold text-white"
          style={{ background: 'var(--pitch)' }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
