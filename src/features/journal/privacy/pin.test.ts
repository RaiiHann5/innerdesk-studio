import { describe, expect, it } from 'vitest'
import { PIN_PATTERN, createPin, verifyPin } from './pin'

describe('pin', () => {
  it('accepts only 4 to 8 digits', () => {
    for (const ok of ['1234', '12345678']) expect(PIN_PATTERN.test(ok)).toBe(true)
    for (const bad of ['123', '123456789', '12a4', '', '12 34']) expect(PIN_PATTERN.test(bad)).toBe(false)
  })

  it('verifies the right PIN and rejects a wrong one', async () => {
    const record = await createPin('4821')
    expect(await verifyPin('4821', record)).toBe(true)
    expect(await verifyPin('4822', record)).toBe(false)
  })

  it('does not store the PIN and salts every record differently', async () => {
    const a = await createPin('4821')
    const b = await createPin('4821')
    expect(JSON.stringify(a)).not.toContain('4821')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })
})
