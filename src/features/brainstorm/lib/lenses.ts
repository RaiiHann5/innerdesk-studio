/** Questions that unstick a brainstorm by changing the angle. The capture stage shows one and steps through them on request. */
export const LENSES: readonly string[] = [
  'Versi paling murah dari ide ini seperti apa?',
  'Kalau tidak ada batas waktu dan uang, apa yang kamu buat?',
  'Apa kebalikan dari semua ide di atas?',
  'Apa yang bisa dibuang supaya jadi lebih sederhana?',
  'Siapa yang paling terbantu, dan apa yang mereka butuhkan lebih dulu?',
  'Kalau harus selesai dalam satu hari, apa yang kamu kerjakan?',
  'Apa yang paling mengganggu sekarang, dan bagaimana menghilangkannya?',
  'Ide siapa yang bisa kamu tiru, lalu ubah sedikit?',
]

/** A small stable hash, so two sessions open on different questions instead of the same one. */
const seedOf = (value: string) => [...value].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7)

/** The lens for a session, `shift` steps along. It wraps, and a negative shift is fine. */
export function lensFor(seed: string, shift = 0): string {
  const length = LENSES.length
  return LENSES[(((seedOf(seed) + shift) % length) + length) % length]
}
