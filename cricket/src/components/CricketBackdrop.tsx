import { CricketMotifs } from './CricketMotifs'

/** Fixed, decorative stadium backdrop sat behind every non-splash screen —
 *  a floodlit glow, floodlight beams, a pitch outline, and slow-drifting
 *  bat/ball/wicket glyphs. It shows clearly in the gaps around and between
 *  cards (headers, padding, the space between stacked cards), while the
 *  cards themselves stay fully opaque, so none of the app's text ever sits
 *  on top of it — purely visual, no screen's layout or logic changes. */
export function CricketBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true" style={{ background: 'var(--surface-page)' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(130% 60% at 50% -10%, var(--pitch-glow), transparent 75%)' }}
      />
      <svg viewBox="0 0 400 800" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {[-150, -60, 60, 150].map((dx) => (
          <polygon key={dx} points={`${200 + dx},-20 ${200 + dx - 50},820 ${200 + dx + 50},820`} fill="var(--pitch)" opacity="0.045" />
        ))}
        <ellipse cx="200" cy="840" rx="380" ry="230" fill="none" stroke="var(--pitch)" strokeOpacity="0.28" strokeWidth="2.5" />
        <ellipse cx="200" cy="840" rx="250" ry="150" fill="none" stroke="var(--pitch)" strokeOpacity="0.2" strokeWidth="1.8" />
        <ellipse cx="200" cy="840" rx="120" ry="72" fill="none" stroke="var(--pitch)" strokeOpacity="0.14" strokeWidth="1.4" />
      </svg>
      <CricketMotifs opacity={0.26} wicketColor="var(--pitch)" />
    </div>
  )
}
