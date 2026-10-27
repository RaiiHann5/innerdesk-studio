import { useCallback, useRef } from 'react'

/**
 * A short chime made in the browser, so the module ships no audio file and works offline.
 *
 * Two sine notes a fifth apart, eased out over about half a second: soft enough to sit behind the
 * work, unlike an alert. Nothing is created until the first play, because an audio context made
 * before a gesture starts suspended.
 */
export function useFocusSound(enabled: boolean, volume: number) {
  const contextRef = useRef<AudioContext | null>(null)

  const play = useCallback(() => {
    if (!enabled) return
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const context = contextRef.current ?? new AudioCtx()
      contextRef.current = context
      if (context.state === 'suspended') void context.resume()

      const level = Math.max(0, Math.min(1, volume))
      const now = context.currentTime

      for (const [offset, frequency, peak] of [
        [0, 523.25, level],
        [0.12, 783.99, level * 0.7],
      ] as const) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, now + offset)
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.18), now + offset + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(now + offset)
        oscillator.stop(now + offset + 0.55)
      }
    } catch {
      // Audio blocked by the browser or the system. The timer itself is unaffected.
    }
  }, [enabled, volume])

  return { play }
}