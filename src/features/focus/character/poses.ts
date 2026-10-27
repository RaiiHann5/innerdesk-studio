import type { FocusMode } from '@/types/domain'

/** The seven poses. Kept as a plain union so a new state cannot be half-handled anywhere. */
export type CompanionPose = 'idle' | 'focus' | 'anticipation' | 'break-short' | 'break-long' | 'paused' | 'complete'

/** The CSS class each pose attaches to the figure. */
export const POSE_CLASS: Record<CompanionPose, string> = {
  idle: 'companion-pose-idle',
  focus: 'companion-pose-focus',
  anticipation: 'companion-pose-anticipation',
  'break-short': 'companion-pose-break-short',
  'break-long': 'companion-pose-break-long',
  paused: 'companion-pose-paused',
  complete: 'companion-pose-complete',
}

/** Indonesian description of what the figure is doing, read out beside the drawing. */
export const POSE_STATUS: Record<CompanionPose, string> = {
  idle: 'Siap memulai',
  focus: 'Sedang fokus',
  anticipation: 'Hampir selesai',
  'break-short': 'Istirahat sebentar',
  'break-long': 'Istirahat panjang',
  paused: 'Dijeda, menunggu',
  complete: 'Sesi selesai',
}

export interface PoseInput {
  mode: FocusMode
  running: boolean
  started: boolean
  /** Under a minute left on a running focus block. */
  lastMinute: boolean
  /** True for a short while after a block ends, before it settles into the break pose. */
  celebrating: boolean
}

/**
 * Timer state to pose.
 *
 * Paused is checked before running, so a paused block never sits in a working pose, and the
 * celebration wins over everything because it is a moment rather than a mode.
 */
export function poseFor({ mode, running, started, lastMinute, celebrating }: PoseInput): CompanionPose {
  if (celebrating) return 'complete'
  if (!started) return 'idle'
  if (!running) return 'paused'
  if (mode === 'focus') return lastMinute ? 'anticipation' : 'focus'
  return mode === 'long' ? 'break-long' : 'break-short'
}