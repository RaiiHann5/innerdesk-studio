// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import VaultPage from './VaultPage'
import { VaultRuntime } from './VaultRuntime'
import { useVaultStore } from './store/vaultStore'

vi.setConfig({ testTimeout: 90_000 })

const PASSWORD = 'correct horse battery staple'

beforeAll(() => {
  // jsdom has no WebCrypto of its own; the browser does. Node's is the same API.
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto)
})

afterEach(() => {
  cleanup()
  useVaultStore.getState().lock('manual')
})

const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } })
const click = (element: HTMLElement) => fireEvent.click(element)

const renderVault = () =>
  render(
    <MemoryRouter initialEntries={['/vault']}>
      <VaultRuntime />
      <VaultPage />
    </MemoryRouter>,
  )

describe('vault screens', () => {
  it('walks setup, shows the recovery key once, locks, rejects a wrong password and unlocks', async () => {
    renderVault()

    // Setup: explains there is no recovery, and a mismatch or short password cannot continue.
    expect(await screen.findByRole('heading', { name: 'Buat vault pribadi' })).toBeTruthy()
    expect(screen.getByText(/Tidak ada pemulihan oleh siapa pun/)).toBeTruthy()
    const next = screen.getByRole('button', { name: 'Lanjut' }) as HTMLButtonElement
    expect(next.disabled).toBe(true)

    const password = screen.getByLabelText('Kata sandi utama') as HTMLInputElement
    expect(password.type).toBe('password')
    expect(password.getAttribute('spellcheck')).toBe('false')
    type(password, 'short')
    type(screen.getByLabelText('Ulangi kata sandi utama'), 'shorter')
    expect(next.disabled).toBe(true)
    expect(screen.getByText('Kata sandi belum sama.')).toBeTruthy()

    type(password, PASSWORD)
    type(screen.getByLabelText('Ulangi kata sandi utama'), PASSWORD)
    expect(screen.getByText(/perkiraan/)).toBeTruthy()
    click(next)

    // Recovery key: shown once, nothing is stored yet, and finishing needs the confirmation.
    expect(await screen.findByRole('heading', { name: 'Simpan kunci pemulihan' }, { timeout: 15_000 })).toBeTruthy()
    expect(localStorage.getItem('pos:v1:vault-meta')).toBeNull()
    const finish = screen.getByRole('button', { name: 'Selesai dan buka vault' }) as HTMLButtonElement
    expect(finish.disabled).toBe(true)
    const groups = within(screen.getByLabelText(/Kunci pemulihan, delapan kelompok/)).getAllByText(/^[0-9A-Z]{4}$/)
    expect(groups).toHaveLength(8)
    const recoveryKey = groups.map((g) => g.textContent).join('-')
    click(screen.getByRole('checkbox'))
    // Finishing also needs two of the groups retyped: the 3rd and the 6th.
    expect(finish.disabled).toBe(true)
    type(screen.getByLabelText('Kelompok ke-3'), groups[2].textContent!.toLowerCase())
    expect(finish.disabled).toBe(true)
    type(screen.getByLabelText('Kelompok ke-6'), groups[5].textContent!)
    expect(finish.disabled).toBe(false)
    click(finish)

    // Unlocked: neither the key nor the password is anywhere in the page.
    expect(await screen.findByRole('button', { name: /Kunci sekarang/ })).toBeTruthy()
    expect(document.body.textContent).not.toContain(recoveryKey)
    expect(document.body.textContent).not.toContain(PASSWORD)
    expect(localStorage.getItem('pos:v1:vault-meta')).not.toBeNull()
    for (const key of Object.keys(localStorage)) expect(localStorage.getItem(key)).not.toContain(PASSWORD)

    // Manual lock from the button, announced for screen readers.
    click(screen.getByRole('button', { name: /Kunci sekarang/ }))
    expect(await screen.findByRole('heading', { name: 'Vault terkunci' })).toBeTruthy()
    expect(document.body.textContent).toContain('Vault dikunci.')

    // Wrong password: a calm, generic message, no hint, still locked.
    type(screen.getByLabelText('Kata sandi utama'), 'not the right one!!')
    click(screen.getByRole('button', { name: 'Buka vault' }))
    expect((await screen.findByRole('alert', {}, { timeout: 15_000 })).textContent).toBe('Vault tidak bisa dibuka. Periksa kata sandi, lalu coba lagi.')
    expect(screen.getByRole('heading', { name: 'Vault terkunci' })).toBeTruthy()

    // Right password.
    type(screen.getByLabelText('Kata sandi utama'), PASSWORD)
    click(screen.getByRole('button', { name: 'Buka vault' }))
    expect(await screen.findByRole('button', { name: /Kunci sekarang/ }, { timeout: 15_000 })).toBeTruthy()
  })

  it('locks on Shift+L', async () => {
    renderVault()
    await waitFor(() => expect(useVaultStore.getState().status).toBe('locked'), { timeout: 15_000 })
    const field = await screen.findByLabelText('Kata sandi utama')
    type(field, PASSWORD)
    click(screen.getByRole('button', { name: 'Buka vault' }))
    await screen.findByRole('button', { name: /Kunci sekarang/ }, { timeout: 15_000 })

    fireEvent.keyDown(document.body, { key: 'L', shiftKey: true })
    expect(await screen.findByRole('heading', { name: 'Vault terkunci' })).toBeTruthy()
    expect(useVaultStore.getState().items).toEqual([])
  })
})
