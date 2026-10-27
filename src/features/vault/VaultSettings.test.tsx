// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { vaultItemRepo } from '@/data/repos'
import { flipByte } from '@/lib/crypto/testing'
import VaultPage from './VaultPage'
import { emptyPayload } from './lib/payload'
import { useVaultPrefs } from './store/vaultPrefs'
import { useVaultStore } from './store/vaultStore'
import type { VaultItemPayload } from './types'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const PASSWORD = 'correct horse battery staple'
const NEW_PASSWORD = 'a brand new passphrase!'
const store = () => useVaultStore.getState()
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })
const click = (el: HTMLElement) => fireEvent.click(el)
const text = () => document.body.textContent ?? ''
const SLOW = { timeout: 30_000 }

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
        <Route path="/vault/pengaturan" element={<VaultPage />} />
        <Route path="/vault/:itemId" element={<VaultPage />} />
      </Routes>
    </MemoryRouter>,
  )

let currentPassword = PASSWORD

beforeAll(async () => {
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto)
  await store().init()
  await store().beginSetup(PASSWORD)
  await store().confirmSetup()
})

beforeEach(async () => {
  if (store().status !== 'unlocked') {
    if (store().status === 'error' || store().status === 'loading') await store().init()
    expect((await store().unlock(currentPassword)).ok).toBe(true)
  }
  // A load started by the previous test's screen may still be running; loadItems ignores a second call until it ends.
  await waitFor(() => expect(store().itemsStatus).not.toBe('loading'))
  await store().loadItems()
  for (const item of [...store().items]) await store().removeItem(item.id)
  await store().loadItems()
  useVaultPrefs.setState({ autoLockMinutes: 5, blurOnBlur: false })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.stubGlobal('crypto', webcrypto)
})

describe('lock settings', () => {
  it('changes the idle limit among 1, 5, 15 and 30 and has no "never"', async () => {
    renderAt('/vault/pengaturan')
    const group = within(await screen.findByRole('radiogroup', { name: 'Kunci otomatis setelah tanpa aktivitas' }, SLOW))
    expect(group.getAllByRole('radio').map((r) => r.textContent)).toEqual(['1 mnt', '5 mnt', '15 mnt', '30 mnt'])
    click(group.getByRole('radio', { name: '15 mnt' }))
    expect(useVaultPrefs.getState().autoLockMinutes).toBe(15)
    expect(text()).toContain('Tidak ada pilihan untuk tidak pernah mengunci')
  })

  it('blurs the vault and hides revealed secrets when the window loses focus, if switched on', async () => {
    const id = await seed({ ...emptyPayload('login'), title: 'Bank', password: 'blur-test-secret' } as VaultItemPayload)
    useVaultPrefs.setState({ blurOnBlur: true })
    renderAt(`/vault/${id}`)
    // jsdom starts without focus, which is exactly the state the shield reacts to: nothing is reachable until focus arrives.
    expect(await screen.findByText('Jendela tidak aktif. Isi vault disamarkan.', {}, SLOW)).toBeTruthy()
    act(() => { window.dispatchEvent(new Event('focus')) })
    await screen.findByRole('heading', { name: 'Bank' }, SLOW)
    click(screen.getByRole('button', { name: 'Tampilkan Kata sandi' }))
    expect(text()).toContain('blur-test-secret')

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(text()).not.toContain('blur-test-secret')
    expect(screen.getByText('Jendela tidak aktif. Isi vault disamarkan.')).toBeTruthy()
    const shielded = screen.getByRole('heading', { name: 'Bank', hidden: true }).closest('[aria-hidden="true"]') as HTMLElement & { inert: boolean }
    expect(shielded.className).toContain('blur-md')
    expect(shielded.inert).toBe(true)

    act(() => { window.dispatchEvent(new Event('focus')) })
    expect(screen.queryByText('Jendela tidak aktif. Isi vault disamarkan.')).toBeNull()
  })

  it('does nothing on blur when the setting is off', async () => {
    const id = await seed({ ...emptyPayload('login'), title: 'Bank', password: 'no-blur-secret' } as VaultItemPayload)
    renderAt(`/vault/${id}`)
    await screen.findByRole('heading', { name: 'Bank' }, SLOW)
    click(screen.getByRole('button', { name: 'Tampilkan Kata sandi' }))
    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(text()).toContain('no-blur-secret')
    expect(screen.queryByText('Jendela tidak aktif. Isi vault disamarkan.')).toBeNull()
  })
})

describe('master password', () => {
  it('needs the current password, then the new one takes over', async () => {
    await seed({ ...emptyPayload('login'), title: 'Bank', password: 'stay-readable' } as VaultItemPayload)
    renderAt('/vault/pengaturan')
    type(await screen.findByLabelText('Kata sandi utama saat ini', {}, SLOW), 'not the current one!!')
    type(screen.getByLabelText('Kata sandi utama baru'), NEW_PASSWORD)
    type(screen.getByLabelText('Ulangi kata sandi baru'), NEW_PASSWORD)
    const submit = screen.getByRole('button', { name: 'Ganti kata sandi' }) as HTMLButtonElement
    expect(submit.disabled).toBe(false)
    click(submit)
    expect((await screen.findByRole('alert', {}, SLOW)).textContent).toBe('Kata sandi utama tidak cocok.')

    type(screen.getByLabelText('Kata sandi utama saat ini'), PASSWORD)
    type(screen.getByLabelText('Kata sandi utama baru'), NEW_PASSWORD)
    type(screen.getByLabelText('Ulangi kata sandi baru'), NEW_PASSWORD)
    click(screen.getByRole('button', { name: 'Ganti kata sandi' }))
    await screen.findByText(/Kata sandi utama diganti/, {}, SLOW)
    currentPassword = NEW_PASSWORD

    store().lock('manual')
    expect(await store().unlock(PASSWORD)).toEqual({ ok: false, error: 'wrong' })
    expect(await store().unlock(NEW_PASSWORD)).toEqual({ ok: true })
    await store().loadItems()
    expect(store().items[0]).toMatchObject({ title: 'Bank', password: 'stay-readable' })
  })

  it('will not submit a short or mismatched new password', async () => {
    renderAt('/vault/pengaturan')
    type(await screen.findByLabelText('Kata sandi utama saat ini', {}, SLOW), currentPassword)
    type(screen.getByLabelText('Kata sandi utama baru'), 'too short')
    type(screen.getByLabelText('Ulangi kata sandi baru'), 'too short')
    expect((screen.getByRole('button', { name: 'Ganti kata sandi' }) as HTMLButtonElement).disabled).toBe(true)
    type(screen.getByLabelText('Kata sandi utama baru'), 'a long enough passphrase')
    expect(screen.getByText('Kata sandi belum sama.')).toBeTruthy()
  })
})

describe('key rotation', () => {
  it('re-encrypts everything, shows a new recovery key once, and needs the retype to finish', async () => {
    await seed({ ...emptyPayload('login'), title: 'Bank', password: 'rotate-secret' } as VaultItemPayload)
    const epochBefore = store().meta!.keyEpoch
    renderAt('/vault/pengaturan')
    type(await screen.findByLabelText('Kata sandi utama', { selector: '#rotate-password' }, SLOW), currentPassword)
    click(screen.getByRole('button', { name: 'Rotasi kunci' }))

    const group = await screen.findByRole('group', { name: 'Kunci pemulihan baru' }, SLOW)
    expect(within(group).getByText(/Kunci pemulihan yang lama tidak berlaku lagi/)).toBeTruthy()
    const groups = within(group).getAllByText(/^[0-9A-Z]{4}$/)
    expect(groups).toHaveLength(8)
    expect(store().meta!.keyEpoch).toBe(epochBefore + 1)

    const done = within(group).getByRole('button', { name: 'Sudah tersimpan' }) as HTMLButtonElement
    click(within(group).getByRole('checkbox'))
    expect(done.disabled).toBe(true)
    type(within(group).getByLabelText('Kelompok ke-3'), groups[2].textContent!)
    type(within(group).getByLabelText('Kelompok ke-6'), groups[5].textContent!)
    expect(done.disabled).toBe(false)
    click(done)
    await screen.findByText(/Kunci diganti dan kunci pemulihan baru sudah dikonfirmasi/)
    expect(text()).not.toContain(groups.map((g) => g.textContent).join('-'))

    store().lock('manual')
    await store().unlock(currentPassword)
    await store().loadItems()
    expect(store().items[0]).toMatchObject({ title: 'Bank', password: 'rotate-secret' })
  })

  it('refuses a wrong password without changing anything', async () => {
    const epoch = store().meta!.keyEpoch
    renderAt('/vault/pengaturan')
    type(await screen.findByLabelText('Kata sandi utama', { selector: '#rotate-password' }, SLOW), 'definitely wrong password')
    click(screen.getByRole('button', { name: 'Rotasi kunci' }))
    expect((await screen.findByRole('alert', {}, SLOW)).textContent).toBe('Kata sandi utama tidak cocok.')
    expect(store().meta!.keyEpoch).toBe(epoch)
  })

  it('explains the recovery steps without ever showing a key', async () => {
    renderAt('/vault/pengaturan')
    const details = (await screen.findByText('Petunjuk pemulihan', {}, SLOW)).closest('details')!
    expect(details.textContent).toContain('tidak bisa dilihat lagi')
    expect(details.textContent).not.toMatch(/([0-9A-Z]{4}-){3}/)
  })
})

describe('backup', () => {
  const capture = () => {
    const blobs: Blob[] = []
    const names: string[] = []
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (b: Blob) => (blobs.push(b), 'blob:test'), revokeObjectURL: () => {} }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download) })
    return { blobs, names }
  }

  it('exports ciphertext only, with a dated file name', async () => {
    await seed({ ...emptyPayload('login'), title: 'Bank', username: 'budi', password: 'export-secret' } as VaultItemPayload)
    const { blobs, names } = capture()
    renderAt('/vault/pengaturan')
    click(await screen.findByRole('button', { name: /Ekspor backup/ }, SLOW))
    await waitFor(() => expect(blobs).toHaveLength(1))
    expect(names[0]).toMatch(/^innerdesk-vault-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const body = await blobs[0].text()
    for (const secret of ['export-secret', 'budi', 'Bank', currentPassword]) expect(body).not.toContain(secret)
    expect(JSON.parse(body).format).toBe('innerdesk-vault-backup')
    vi.restoreAllMocks()
  })

  it('restores a backup after the person confirms the replacement, and brings back the old items', async () => {
    await seed({ ...emptyPayload('login'), title: 'Dari backup', password: 'backup-secret' } as VaultItemPayload)
    const backup = await store().exportBackup()
    for (const item of [...store().items]) await store().removeItem(item.id)
    await seed({ ...emptyPayload('login'), title: 'Setelah backup', password: 'later-secret' } as VaultItemPayload)

    renderAt('/vault/pengaturan')
    const form = within(await screen.findByRole('form', { name: 'Pulihkan dari backup terenkripsi' }, SLOW))
    fireEvent.change(form.getByLabelText('File backup (.json)'), { target: { files: [new File([backup], 'backup.json', { type: 'application/json' })] } })
    await waitFor(() => expect(form.getByText('Dipilih: backup.json')).toBeTruthy())
    type(form.getByLabelText('Kata sandi utama saat backup dibuat'), currentPassword)
    const restore = form.getByRole('button', { name: 'Pulihkan' }) as HTMLButtonElement
    expect(restore.disabled).toBe(true)
    click(form.getByRole('checkbox'))
    expect(restore.disabled).toBe(false)
    click(restore)

    await screen.findByText(/Backup dipulihkan/, {}, SLOW)
    await store().loadItems()
    expect(store().items.map((i) => (i.kind === 'login' ? i.title : ''))).toEqual(['Dari backup'])
  })

  it('rejects a file that is not a backup, and says the vault was not changed', async () => {
    renderAt('/vault/pengaturan')
    const form = within(await screen.findByRole('form', { name: 'Pulihkan dari backup terenkripsi' }, SLOW))
    fireEvent.change(form.getByLabelText('File backup (.json)'), { target: { files: [new File(['{"hello":1}'], 'x.json')] } })
    await waitFor(() => expect(form.getByText('Dipilih: x.json')).toBeTruthy())
    type(form.getByLabelText('Kata sandi utama saat backup dibuat'), currentPassword)
    click(form.getByRole('checkbox'))
    click(form.getByRole('button', { name: 'Pulihkan' }))
    expect((await screen.findByRole('alert', {}, SLOW)).textContent).toContain('Vault yang ada tidak diubah')
  })

  it('restores from the error screen when the stored vault cannot be read', async () => {
    await seed({ ...emptyPayload('login'), title: 'Selamat', password: 'survivor' } as VaultItemPayload)
    const backup = await store().exportBackup()
    store().lock('manual')
    localStorage.setItem('pos:v1:vault-meta', '{broken')
    useVaultStore.setState({ status: 'loading' })

    renderAt('/vault')
    await screen.findByText('Vault tidak bisa dibuka', {}, SLOW)
    const form = within(screen.getByRole('form', { name: 'Pulihkan dari backup terenkripsi' }))
    fireEvent.change(form.getByLabelText('File backup (.json)'), { target: { files: [new File([backup], 'backup.json')] } })
    await waitFor(() => expect(form.getByText('Dipilih: backup.json')).toBeTruthy())
    type(form.getByLabelText('Kata sandi utama saat backup dibuat'), currentPassword)
    click(form.getByRole('button', { name: 'Pulihkan' }))
    await screen.findByRole('button', { name: /Kunci sekarang/ }, SLOW)
    expect(JSON.parse(localStorage.getItem('pos:v1:vault-meta')!).version).toBe(1)
  })

  it('offers to delete unreadable items, after a confirm, and keeps the readable ones', async () => {
    const good = await seed({ ...emptyPayload('login'), title: 'Baik', password: 'ok' } as VaultItemPayload)
    const bad = await seed({ ...emptyPayload('login'), title: 'Rusak', password: 'nope' } as VaultItemPayload)
    const record = (await vaultItemRepo.get(bad))!
    await vaultItemRepo.put({ ...record, ciphertext: flipByte(record.ciphertext, 7) }, store().meta!.keyEpoch)
    store().lock('manual')
    await store().unlock(currentPassword)
    await store().loadItems()

    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
    renderAt('/vault/pengaturan')
    click(await screen.findByRole('button', { name: 'Hapus 1 item rusak' }, SLOW))
    expect(screen.getByText('Hapus 1 item rusak?')).toBeTruthy()
    click(screen.getByRole('button', { name: 'Hapus permanen' }))
    await screen.findByText('1 item rusak dihapus.', {}, SLOW)
    expect((await vaultItemRepo.list()).map((i) => i.id)).toEqual([good])
  })
})

describe('setup extras', () => {
  it('shows the explanation of limits on the lock screen, with the main limits stated plainly', async () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    store().lock('manual')
    renderAt('/vault')
    click(await screen.findByRole('button', { name: 'Cara kerja dan batasan' }, SLOW))
    const dialog = screen.getByRole('dialog', { name: 'Cara kerja dan batasan', hidden: true })
    for (const phrase of ['Malware atau keylogger', 'Skrip jahat', 'Tidak ada pemulihan oleh siapa pun', 'Tidak ada skrip pihak ketiga']) expect(dialog.textContent).toContain(phrase)
    expect(dialog.textContent?.toLowerCase()).not.toContain('tidak bisa diretas')
    expect(dialog.textContent?.toLowerCase()).not.toContain('unhackable')
  })

  it('explains itself instead of failing silently when the browser has no WebCrypto', () => {
    vi.stubGlobal('crypto', undefined)
    renderAt('/vault')
    expect(screen.getByText('Vault butuh koneksi aman')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Buka vault' })).toBeNull()
  })
})
