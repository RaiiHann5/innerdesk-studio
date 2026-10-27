import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { Book, Confetti, Cup, Desk, Flag, Laptop, Pillow, SleepZ, SweatDrop } from './props'
import { POSE_CLASS, type CompanionPose } from './poses'
import './companion.css'

interface CompanionProps {
  pose: CompanionPose
  /** The text a screen reader gets instead of the drawing. */
  status: string
  size?: number
  /** Still drawing of the pose, no loops. The system setting does the same without this. */
  reduceMotion?: boolean
  className?: string
}

/**
 * A small round creature: a body, a leaf, two dot eyes and a mouth. One orange body, one muted
 * green leaf, one off-white, and warm ink for every line, at one weight (set once on the root).
 *
 * The face never moves except by closing, so the expression is carried by the eyelids and the
 * mouth rather than by shifting features, and it stays readable at 96px.
 *
 * Layers, back to front: props it leans on, the figure, props it sits behind. The pose class on the
 * root decides what is shown and how each named group is placed, so a change of pose is a change of
 * class and the CSS transitions carry it across.
 */
export function Companion({ pose, status, size = 176, reduceMotion = false, className }: CompanionProps) {
  // A hidden tab costs nothing: every loop stops where it stands and resumes in place.
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const onChange = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* Decorative. The status beside it carries the meaning, so a screen reader never reads a drawing. */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-calm={reduceMotion || undefined}
        className={cn('companion-figure size-full', POSE_CLASS[pose], hidden && 'companion-paused')}
      >
        <Pillow />
        <Flag />

        <g className="companion-figure-body">
          <g className="companion-breathe">
            <g className="companion-leaf">
              <path d="M100 58V44" className="stroke-ink" />
              <path d="M100 46c-14 0-23-8-22-20 12-2 22 6 22 20z" className="fill-companion-leaf stroke-ink" />
              <path d="M100 46c14 0 23-8 22-20-12-2-22 6-22 20z" className="fill-companion-leaf stroke-ink" />
            </g>

            <path d="M82 162v14M118 162v14" className="companion-legs stroke-ink" />
            <g className="companion-head">
              <circle cx="100" cy="112" r="54" className="fill-accent stroke-ink" />
              <ellipse cx="100" cy="134" rx="32" ry="21" className="fill-companion-belly" />

              <g className="companion-eyes">
                <circle cx="82" cy="102" r="5" className="fill-companion-dark" />
                <circle cx="118" cy="102" r="5" className="fill-companion-dark" />
                <circle cx="83.5" cy="100.5" r="1.5" className="fill-companion-belly" />
                <circle cx="119.5" cy="100.5" r="1.5" className="fill-companion-belly" />
              </g>
              {/* Lids are body-coloured and scale down from the top of the eye. At rest they sit half shut. */}
              <rect x="74" y="95" width="16" height="12" rx="6" className="companion-lid fill-accent" />
              <rect x="110" y="95" width="16" height="12" rx="6" className="companion-lid fill-accent" />
              {/* Closed eyes for sleep, drawn over the lids. */}
              <path d="M75 102q7 6 14 0M111 102q7 6 14 0" className="companion-shut fill-none stroke-companion-dark" />

              <path d="M92 124h16" className="companion-flat fill-none stroke-companion-dark" />
              <path d="M90 122q10 9 20 0" className="companion-smile fill-none stroke-companion-dark" />
              <SweatDrop />
            </g>

            {/* In front of the body, so they can reach the keys, hold the cup and go up in the air. */}
            <path d="M47 118Q35 134 39 152" className="companion-arm companion-arm-l fill-none stroke-ink" />
            <path d="M153 118Q165 134 161 152" className="companion-arm companion-arm-r fill-none stroke-ink" />
          </g>
        </g>

        <Desk />
        <Laptop />
        <Book />
        <Cup />
        <SleepZ />
        <Confetti />
      </svg>
      <span className="sr-only">{status}</span>
    </div>
  )
}
