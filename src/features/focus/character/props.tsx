/**
 * What the companion sits at, holds or leaves behind.
 *
 * Every prop is always in the drawing and is shown by the pose's CSS, so a prop fades in and out
 * with the rest of the figure instead of popping in. They use the three companion colours and ink,
 * and take their line weight from the figure, so none of them can look like it came from elsewhere.
 */

/** Behind the figure: it leans on these. */
export function Pillow() {
  return <rect x="10" y="146" width="92" height="30" rx="15" className="companion-prop companion-pillow fill-companion-belly stroke-ink" />
}

export function Flag() {
  return (
    <g className="companion-prop companion-flag">
      <path d="M164 152V102" className="stroke-ink" />
      <path d="M164 104h22l-6 9 6 9h-22z" className="fill-accent stroke-ink" />
    </g>
  )
}

/** In front of the figure: it sits behind these, so the desk covers its lap. */
export function Desk() {
  return (
    <g className="companion-prop companion-desk">
      <path d="M44 157v21M156 157v21" className="stroke-ink" />
      <rect x="34" y="148" width="132" height="9" rx="3" className="fill-companion-belly stroke-ink" />
    </g>
  )
}

/** Seen from behind: a dark lid with one orange dot, the way a laptop looks to the person opposite it. */
export function Laptop() {
  return (
    <g className="companion-prop companion-laptop">
      <rect x="78" y="132" width="44" height="16" rx="3" className="fill-companion-dark stroke-ink" />
      <circle cx="100" cy="140" r="2.5" className="fill-accent" />
    </g>
  )
}

export function Book() {
  return (
    <g className="companion-prop companion-book">
      <rect x="132" y="137" width="28" height="11" rx="2" className="fill-companion-belly stroke-ink" />
      <path d="M143 137v11" className="stroke-companion-dark" />
    </g>
  )
}

export function Cup() {
  return (
    <g className="companion-prop companion-cup">
      <path d="M111 134h20v17a7 7 0 0 1-7 7h-6a7 7 0 0 1-7-7z" className="fill-companion-belly stroke-ink" />
      <path d="M131 140h3a5 5 0 0 1 0 10h-3" className="fill-none stroke-ink" />
    </g>
  )
}

/** A drawn "z", not a text character. Two of them, the second a beat behind the first. */
export function SleepZ() {
  return (
    <g className="fill-none stroke-ink">
      <path d="M138 70h12l-12 14h12" className="companion-z" />
      <path d="M156 48h12l-12 14h12" className="companion-z companion-z-late" />
    </g>
  )
}

/** One bead of sweat, for the last minute of a focus block. */
export function SweatDrop() {
  return <path d="M144 84c0 0 7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z" className="companion-sweat fill-companion-belly stroke-ink" />
}

/** A few flat rectangles. Deliberately rectangles: confetti, not sparkles. */
export function Confetti() {
  return (
    <g>
      <rect x="60" y="64" width="9" height="5" className="companion-confetti companion-confetti-a fill-accent" />
      <rect x="138" y="58" width="8" height="5" className="companion-confetti companion-confetti-b fill-ink" />
      <rect x="102" y="40" width="7" height="5" className="companion-confetti companion-confetti-c fill-accent" />
      <rect x="82" y="52" width="6" height="4" className="companion-confetti companion-confetti-d fill-ink" />
    </g>
  )
}
