/**
 * A short chime made in the browser, so the module ships no audio file and works offline.
 *
 * Two sine notes a fifth apart, eased out over about half a second: soft enough to sit behind the
 * work, unlike an alert. The audio context is created on first use, because one made before a
 * gesture starts suspended.
 */
let context: AudioContext | null = null

export function playChime(volume: number): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    context ??= new Ctx()
    if (context.state === 'suspended') void context.resume()

    const level = Math.max(0, Math.min(1, volume))
    const start = context.currentTime
    for (const [offset, frequency, peak] of [
      [0, 523.25, level],
      [0.12, 783.99, level * 0.7],
    ] as const) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.18), start + offset + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.5)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.55)
    }
  } catch {
    // Audio blocked by the browser or the system. The timer itself is unaffected.
  }
}
