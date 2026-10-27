import { describe, expect, it } from 'vitest'
import { STRENGTH_LABELS, estimateStrength } from './strength'

describe('estimateStrength', () => {
  it('handles the empty string without a hint nagging', () => {
    expect(estimateStrength('')).toEqual({ bits: 0, level: 0, label: 'Sangat lemah', hints: [] })
  })

  it('scores repeats, runs, keyboard rows and very common passwords as very weak, even when long', () => {
    for (const weak of ['aaaaaaaaaaaaaaaa', '123456789012', 'abcdefghijkl', 'qwertyuiop12', 'password1234', 'P@ssw0rd', 'abababababababab', '0987654321']) {
      expect(estimateStrength(weak).level, weak).toBe(0)
    }
  })

  it('caps anything under 12 characters at "Lemah" and says so', () => {
    const short = estimateStrength('Zq7#kP2!mX')
    expect(short.level).toBeLessThanOrEqual(1)
    expect(short.hints[0]).toMatch(/minimal 12/)
  })

  it('rates a random-looking 16 characters as strong and 24 as very strong', () => {
    expect(estimateStrength('k9#Vq2!xLm7@Zp4w').level).toBe(3)
    expect(estimateStrength('k9#Vq2!xLm7@Zp4wR8%tY3&n').level).toBe(4)
  })

  it('scores a passphrase by distinct words, so 4 words is fair and 5 or 6 is strong', () => {
    expect(estimateStrength('correct horse battery staple').level).toBe(2)
    expect(estimateStrength('correct horse battery staple orbit').level).toBe(3)
    expect(estimateStrength('correct horse battery staple orbit lantern ridge').level).toBe(4)
    expect(estimateStrength('correct horse battery staple').hints.join(' ')).toMatch(/5 atau 6 kata/)
  })

  it('does not let repeated words inflate a passphrase', () => {
    expect(estimateStrength('kucing kucing kucing kucing kucing kucing').level).toBeLessThanOrEqual(1)
  })

  it('sorts a longer mixed password above a shorter one and never goes down when a character is added', () => {
    let last = 0
    let text = ''
    for (const char of 'Xt9$mQ2@vL5#nR8!wK3') {
      text += char
      const { bits } = estimateStrength(text)
      expect(bits).toBeGreaterThanOrEqual(last)
      last = bits
    }
  })

  it('counts characters, not UTF-16 units, and normalises Unicode', () => {
    expect(estimateStrength('🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑').level).toBe(0)
    expect(estimateStrength('é'.normalize('NFD').repeat(12)).bits).toBe(estimateStrength('é'.repeat(12)).bits)
    expect(estimateStrength('日本語のパスワードです長い文').bits).toBeGreaterThan(0)
  })

  it('stays finite and quick on very long input', () => {
    const started = Date.now()
    const result = estimateStrength('xK9#'.repeat(5000) + 'end')
    expect(Number.isFinite(result.bits)).toBe(true)
    expect(Date.now() - started).toBeLessThan(500)
  })

  it('always returns a known label and at most three hints', () => {
    for (const sample of ['a', 'password', '12345678', 'correct horse', 'k9#Vq2!xLm7@Zp4w']) {
      const { level, label, hints } = estimateStrength(sample)
      expect(label).toBe(STRENGTH_LABELS[level])
      expect(hints.length).toBeLessThanOrEqual(3)
    }
  })
})
