/** Flat overlapping outlines behind the hero. Hairline strokes and a faint fill, no gradients. */
const SHAPES = [
  { cx: 40, rx: 70, ry: 150 },
  { cx: 170, rx: 95, ry: 190 },
  { cx: 330, rx: 80, ry: 160 },
  { cx: 480, rx: 110, ry: 200 },
  { cx: 650, rx: 85, ry: 170 },
  { cx: 800, rx: 105, ry: 195 },
  { cx: 950, rx: 80, ry: 160 },
  { cx: 1090, rx: 100, ry: 185 },
  { cx: 1200, rx: 75, ry: 150 },
] as const

export function HeroPattern() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full text-accent"
      viewBox="0 0 1200 176"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {SHAPES.map((s) => (
        <ellipse
          key={s.cx}
          cx={s.cx}
          cy={88}
          rx={s.rx}
          ry={s.ry}
          fill="currentColor"
          fillOpacity={0.05}
          stroke="currentColor"
          strokeOpacity={0.2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
