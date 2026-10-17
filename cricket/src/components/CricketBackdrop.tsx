import { CricketMotifs } from './CricketMotifs'

/** Fixed, decorative stadium backdrop sat behind every non-splash screen —
 *  a soft floodlight glow, a faint pitch outline, and slow-drifting bat/ball/
 *  wicket glyphs, all low-opacity so the existing cards and copy stay fully
 *  readable on top of it. Purely visual: no screen's layout or logic changes. */
export function CricketBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true" style={{ background: 'var(--surface-page)' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 55% at 50% -8%, var(--pitch-glow), transparent 70%)' }}
      />
      <svg viewBox="0 0 400 800" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="200" cy="840" rx="380" ry="230" fill="none" stroke="var(--pitch)" strokeOpacity="0.1" strokeWidth="2" />
        <ellipse cx="200" cy="840" rx="250" ry="150" fill="none" stroke="var(--pitch)" strokeOpacity="0.07" strokeWidth="1.4" />
      </svg>
      <CricketMotifs opacity={0.09} wicketColor="var(--pitch)" />
    </div>
  )
}
