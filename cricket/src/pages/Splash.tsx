import { useEffect, useState } from 'react'

export function Splash({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1600)
    const t2 = setTimeout(onDone, 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500"
      style={{ background: '#0d1f16', opacity: fading ? 0 : 1 }}
    >
      <svg viewBox="0 0 400 700" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="floodlight" cx="50%" cy="8%" r="75%">
            <stop offset="0%" stopColor="#2a5c3f" />
            <stop offset="100%" stopColor="#0d1f16" />
          </radialGradient>
          <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f6b45" />
            <stop offset="100%" stopColor="#164d32" />
          </linearGradient>
        </defs>
        <rect width="400" height="700" fill="url(#floodlight)" />
        {/* stadium curve */}
        <ellipse cx="200" cy="560" rx="340" ry="200" fill="url(#pitch)" opacity="0.9" />
        <ellipse cx="200" cy="560" rx="340" ry="200" fill="none" stroke="#f3ead3" strokeOpacity="0.15" strokeWidth="2" />
        {/* pitch strip */}
        <polygon points="170,700 230,700 205,420 195,420" fill="#d9c79a" opacity="0.35" />
        {/* stumps silhouette */}
        <g opacity="0.95">
          <rect x="188" y="460" width="6" height="60" fill="#f3ead3" />
          <rect x="200" y="460" width="6" height="60" fill="#f3ead3" />
          <rect x="212" y="460" width="6" height="60" fill="#f3ead3" />
          <rect x="186" y="455" width="34" height="5" fill="#f3ead3" />
        </g>
        {/* floodlight beams */}
        {[-120, -40, 40, 120].map((dx) => (
          <polygon key={dx} points={`${200 + dx},0 ${200 + dx - 30},700 ${200 + dx + 30},700`} fill="#f3ead3" opacity="0.025" />
        ))}
        {/* ball */}
        <circle cx="278" cy="430" r="16" fill="#a8222c" opacity="0.95" />
      </svg>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="mb-3 text-[13px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#f3ead3cc' }}>
          Cricket Scorer
        </span>
        <h1
          className="text-[40px] font-bold leading-tight"
          style={{ fontFamily: "'Oswald', system-ui, sans-serif", color: '#f8faf4' }}
        >
          Star Kala Gujran
        </h1>
        <div className="mt-6 h-[3px] w-16 rounded-full" style={{ background: '#a8222c' }} />
      </div>
    </div>
  )
}
