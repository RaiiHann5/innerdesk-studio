// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { vaultItemRepo } from '@/data/repos'
import { useUiStore } from '@/stores/ui'
import VaultPage from './VaultPage'
import { emptyPayload } from './lib/payload'
import { useVaultStore } from './store/vaultStore'
import type { VaultItemPayload } from './types'

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 })

const PASSWORD = 'correct horse battery staple'
const store = () => useVaultStore.getState()
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })
const click = (el: HTMLElement) => fireEvent.click(el)
const text = () => document.body.textContent ?? ''
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

let clipboard = ''

const seed = async (payload: VaultItemPayload) => {
  const result = await store().saveItem(payload)
  if (!result.ok) throw new Error('seed failed')
  return result.id
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/vault/:itemId" element={<VaultPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeAll(async () => {
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto)
  // jsdom has no <dialog> behaviour; the browser does.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
  await store().init()
  await store().beginSetup(PASSWORD)
  await store().confirmSetup()
})

beforeEach(async () => {
  clipboard = ''
  vi.stubGlobal('navigator', {
    clipboard: { writeText: async (v: string) => { clipboard = v }, readText: async () => clipboard },
  })
  if (store().status !== 'unlocked') expect((await store().unlock(PASSWORD)).ok).toBe(true)
  for (const item of [...store().items]) await store().removeItem(item.id)
  await store().loadItems()
  useUiStore.getState().clearToast()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('creating an item', () => {
  it('builds a login with the inline generator, and the password stays out of the DOM until revealed', async () => {
    renderAt('/vault')
    click((await screen.findAllByRole('button', { name: /Item baru/ }, { timeout: 15_000 }))[0])

    type(screen.getByLabelText('Judul'), 'Bank')
    type(screen.getByLabelText('Nama pengguna'), 'budi')
    click(screen.getByRole('button', { name: 'Buat kata sandi acak' }))
    const generator = screen.getByRole('group', { name: 'Pembuat kata sandi' })
    expect(within(generator).getByText(/Entropi ≈ \d+ bit/)).toBeTruthy()
    click(within(generator).getByRole('button', { name: 'Pakai' }))
    const field = screen.getByLabelText('Kata sandi') as HTMLInputElement
    expect(field.type).toBe('password')
    expect(field.value.length).toBe(20)
    expect(field.getAttribute('autocomplete')).toBe('new-password')
    expect(field.getAttribute('spellcheck')).toBe('false')
    click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByRole('heading', { name: 'Bank' })).toBeTruthy()
    const saved = store().items[0]
    const secret = saved.kind === 'login' ? saved.password : ''
    expect(secret).toHaveLength(20)
    expect(text()).not.toContain(secret)
    expect(within(screen.getByRole('region', { name: 'Detail item' })).getByText('budi')).toBeTruthy()

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    click(screen.getByRole('button', { name: 'Tampilkan Kata sandi' }))
    expect(text()).toContain(secret)
    await advance(9_000)
    expect(text()).toContain(secret)
    await advance(1_500)
    expect(text()).not.toContain(secret)
    expect(screen.getByRole('button', { name: 'Tampilkan Kata sandi' })).toBeTruthy()
  })

  it('rejects an empty title with a clear message and stores nothing', async () => {
    renderAt('/vault')
    click((await screen.findAllByRole('button', { name: /Item baru/ }, { timeout: 15_000 }))[0])
    click(screen.getByRole('button', { name: 'Simpan' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Judul wajib diisi.')
    expect(await vaultItemRepo.list()).toEqual([])
  })

  it('offers all four kinds and a Wi-Fi item has no title or favourite', async () => {
    renderAt('/vault')
    click((await screen.findAllByRole('button', { name: /Item baru/ }, { timeout: 15_000 }))[0])
    const kinds = within(screen.getByRole('radiogroup', { name: 'Jenis item baru' }))
    for (const name of ['Login', 'Kunci API', 'Catatan aman', 'Wi-Fi']) expect(kinds.getByRole('radio', { name })).toBeTruthy()
    click(kinds.getByRole('radio', { name: 'Wi-Fi' }))
    type(screen.getByLabelText('Nama jaringan'), 'Rumah')
    click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByRole('heading', { name: 'Rumah' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /favorit/i })).toBeNull()
  })
})

describe('reading an item', () => {
  it('copies a secret, shows a countdown note, and clears the clipboard after 20 seconds', async () => {
    const id = await seed({ ...emptyPayload('apiKey'), title: 'Stripe', service: 'payments', key: 'sk_live_abc123' } as VaultItemPayload)
    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Stripe' }, { timeout: 15_000 })
    expect(text()).not.toContain('sk_live_abc123')

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    await act(async () => { click(screen.getByRole('button', { name: 'Salin Kunci API' })) })
    expect(clipboard).toBe('sk_live_abc123')
    expect(screen.getByText(/Papan klip dibersihkan otomatis dalam 20 detik/)).toBeTruthy()
    expect(text()).not.toContain('sk_live_abc123')
    await advance(20_500)
    expect(clipboard).toBe('')
    expect(text()).toContain('Papan klip sudah dibersihkan.')
  })

  it('shows a secure note body only after revealing it', async () => {
    const id = await seed({ ...emptyPayload('secureNote'), title: 'Resep', body: 'rahasia dapur' } as VaultItemPayload)
    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Resep' }, { timeout: 15_000 })
    expect(text()).not.toContain('rahasia dapur')
    click(screen.getByRole('button', { name: 'Tampilkan Isi catatan' }))
    expect(text()).toContain('rahasia dapur')
  })

  it('only turns web addresses into links', async () => {
    const id = await seed({ ...emptyPayload('login'), title: 'Situs', urls: ['bank.co.id', 'javascript:alert(1)'] } as VaultItemPayload)
    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Situs' }, { timeout: 15_000 })
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('target') === '_blank')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://bank.co.id/')
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer')
  })
})

describe('finding items', () => {
  it('searches in memory, filters by kind, puts favourites first, and never matches a secret', async () => {
    await seed({ ...emptyPayload('login'), title: 'Bank', username: 'budi', password: 'hunter2-secret' } as VaultItemPayload)
    await seed({ ...emptyPayload('apiKey'), title: 'Stripe', service: 'payments', key: 'sk_live_abc', favorite: true } as VaultItemPayload)
    await seed({ ...emptyPayload('wifi'), ssid: 'Rumah', password: 'wifi-secret-1' } as VaultItemPayload)
    renderAt('/vault')
    const list = await screen.findByRole('region', { name: 'Daftar item' }, { timeout: 15_000 })
    const rows = () => within(list).getAllByRole('link').map((a) => a.textContent)

    expect(rows()[0]).toContain('Stripe')
    expect(rows()).toHaveLength(3)

    type(screen.getByLabelText('Cari di vault'), 'budi')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toContain('Bank')
    type(screen.getByLabelText('Cari di vault'), 'hunter2')
    expect(within(list).getByText('Tidak ada hasil')).toBeTruthy()

    type(screen.getByLabelText('Cari di vault'), '')
    click(within(screen.getByRole('radiogroup', { name: 'Saring jenis item' })).getByRole('radio', { name: 'Wi-Fi' }))
    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toContain('Rumah')
    expect(text()).not.toContain('wifi-secret-1')
  })

  it('shows an empty state with a way to start', async () => {
    renderAt('/vault')
    expect(await screen.findByText('Vault masih kosong', {}, { timeout: 15_000 })).toBeTruthy()
  })
})

describe('changing and deleting', () => {
  it('keeps the old password in the history after an edit', async () => {
    const id = await seed({ ...emptyPayload('login'), title: 'Email', password: 'old-password-1' } as VaultItemPayload)
    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Email' }, { timeout: 15_000 })
    click(screen.getByRole('button', { name: 'Ubah item' }))
    type(screen.getByLabelText('Kata sandi'), 'new-password-2')
    click(screen.getByRole('button', { name: 'Simpan' }))
    await screen.findByText('Riwayat kata sandi (1)')
    expect(text()).not.toContain('old-password-1')
    const edited = store().items[0]
    expect(edited.kind === 'login' ? edited.passwordHistory[0].password : null).toBe('old-password-1')
  })

  it('deletes after a confirm, and undo brings back the same ciphertext', async () => {
    const id = await seed({ ...emptyPayload('login'), title: 'Hapus saya', password: 'to-be-deleted' } as VaultItemPayload)
    const before = await vaultItemRepo.get(id)
    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Hapus saya' }, { timeout: 15_000 })
    click(screen.getByRole('button', { name: 'Hapus item' }))
    expect(screen.getByText('Hapus item ini?')).toBeTruthy()
    click(screen.getByRole('button', { name: 'Hapus' }))

    await waitFor(() => expect(store().items).toEqual([]))
    expect(await vaultItemRepo.get(id)).toBeNull()
    const toast = useUiStore.getState().toast
    expect(toast?.message).toBe('Item dihapus')
    expect(toast?.message).not.toContain('Hapus saya')

    await act(async () => { toast!.action!.run() })
    await waitFor(() => expect(store().items).toHaveLength(1))
    expect(await vaultItemRepo.get(id)).toEqual(before)
  })

  it('shows "not found" for an id that does not exist, and leaves nothing of an item once locked', async () => {
    const id = await seed({ ...emptyPayload('login'), title: 'Rahasia', password: 'zzz-secret-zzz' } as VaultItemPayload)
    renderAt('/vault/tidak-ada')
    expect(await screen.findByText('Item tidak ditemukan', {}, { timeout: 15_000 })).toBeTruthy()
    cleanup()

    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Rahasia' }, { timeout: 15_000 })
    click(screen.getByRole('button', { name: /Kunci sekarang/ }))
    await screen.findByRole('heading', { name: 'Vault terkunci' })
    expect(text()).not.toContain('Rahasia')
    expect(text()).not.toContain('zzz-secret-zzz')
    expect(store().items).toEqual([])
    for (const key of Object.keys(localStorage)) expect(localStorage.getItem(key)).not.toContain('zzz-secret-zzz')
  })
})
