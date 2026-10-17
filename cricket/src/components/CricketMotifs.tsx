function WicketGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 24 32" fill="none" style={{ display: 'block' }}>
      <rect x="3" y="6" width="2.4" height="24" rx="1.2" fill={color} />
      <rect x="10.8" y="4" width="2.4" height="26" rx="1.2" fill={color} />
      <rect x="18.6" y="6" width="2.4" height="24" rx="1.2" fill={color} />
      <rect x="2" y="2" width="9" height="2.4" rx="1.2" fill={color} />
      <rect x="13" y="0.5" width="9" height="2.4" rx="1.2" fill={color} />
    </svg>
  )
}

interface Motif {
  kind: 'ball' | 'bat' | 'wicket'
  top: string
  left: string
  size: number
  anim: 'drift-a' | 'drift-b' | 'drift-c'
  duration: string
  delay: string
}

const MOTIFS: Motif[] = [
  { kind: 'bat', top: '7%', left: '10%', size: 30, anim: 'drift-a', duration: '9s', delay: '0s' },
  { kind: 'ball', top: '16%', left: '80%', size: 20, anim: 'drift-b', duration: '11s', delay: '1.2s' },
  { kind: 'wicket', top: '34%', left: '5%', size: 24, anim: 'drift-c', duration: '13s', delay: '0.6s' },
  { kind: 'bat', top: '60%', left: '92%', size: 24, anim: 'drift-b', duration: '10s', delay: '2s' },
  { kind: 'ball', top: '63%', left: '15%', size: 18, anim: 'drift-a', duration: '8s', delay: '1.5s' },
  { kind: 'wicket', top: '78%', left: '68%', size: 22, anim: 'drift-c', duration: '12s', delay: '0.3s' },
  { kind: 'ball', top: '90%', left: '42%', size: 16, anim: 'drift-b', duration: '9.5s', delay: '2.4s' },
  { kind: 'bat', top: '2%', left: '55%', size: 18, anim: 'drift-c', duration: '10.5s', delay: '0.9s' },
]

/** Faint floating bat/ball/wicket glyphs, purely decorative. `opacity` controls
 *  how visible they are — low for the persistent app background, higher for
 *  the splash screen's hero moment. */
export function CricketMotifs({ opacity = 0.1, wicketColor = 'currentColor' }: { opacity?: number; wicketColor?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {MOTIFS.map((m, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: m.top,
            left: m.left,
            fontSize: m.size,
            lineHeight: 1,
            opacity,
            animation: `${m.anim} ${m.duration} ease-in-out infinite`,
            animationDelay: m.delay,
          }}
        >
          {m.kind === 'wicket' ? <WicketGlyph size={m.size} color={wicketColor} /> : m.kind === 'bat' ? '🏏' : '🔴'}
        </div>
      ))}
    </div>
  )
}
