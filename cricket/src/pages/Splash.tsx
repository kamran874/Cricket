import { useEffect, useState } from 'react'
import { CricketMotifs } from '../components/CricketMotifs'

export function Splash({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 3500)
    const t2 = setTimeout(onDone, 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 flex flex-col items-center overflow-hidden transition-opacity duration-500"
      style={{ background: '#0d1f16', opacity: fading ? 0 : 1 }}
    >
      <svg viewBox="0 0 400 700" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="floodlight" cx="50%" cy="4%" r="80%">
            <stop offset="0%" stopColor="#2a5c3f" />
            <stop offset="100%" stopColor="#0d1f16" />
          </radialGradient>
        </defs>
        <rect width="400" height="700" fill="url(#floodlight)" />
        {[-140, -55, 55, 140].map((dx) => (
          <polygon key={dx} points={`${200 + dx},0 ${200 + dx - 36},700 ${200 + dx + 36},700`} fill="#f3ead3" opacity="0.025" />
        ))}
        <ellipse cx="200" cy="760" rx="360" ry="210" fill="none" stroke="#f3ead3" strokeOpacity="0.12" strokeWidth="2" />
      </svg>

      <CricketMotifs opacity={0.6} wicketColor="#f3ead3" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-8">
        <div className="h-[2px] w-10 rounded-full" style={{ background: '#a8222c' }} />
        <span className="mt-4 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: '#f3ead3b3' }}>
          Cricket Scorer
        </span>
        <h1
          className="mt-1 text-center text-[44px] font-bold leading-tight"
          style={{ fontFamily: "'Oswald', system-ui, sans-serif", color: '#f8faf4' }}
        >
          Star Kala CC
        </h1>
        <div className="mt-6 h-[2px] w-10 rounded-full" style={{ background: '#a8222c' }} />
      </div>
    </div>
  )
}
