import { supabase } from '@/lib/supabase'
import { VaultError } from '@/lib/crypto/errors'
import { parseEncryptedItem, parseEncryptedItems, parseVaultMeta } from '@/lib/crypto/schema'
import type { EncryptedItem, VaultMeta } from '@/lib/crypto/types'
import type { VaultItemRepo, VaultMetaRepo } from '../interfaces'
import { toIso, type Row } from './codec'
import { fetchAll } from './query'

/**
 * The two vault repos for Supabase. They move ciphertext and wrapped keys and nothing else, so there is nothing here that
 * could log a secret, and no message below carries data: every failure is a `VaultError` with its generic text.
 * Writes that must be atomic (item writes checked against the key epoch, the staged set going live together with the
 * meta record) are database functions, see supabase/migrations. Reads are validated strictly by the same parsers the
 * local repos use, so a damaged record throws `corrupt` instead of passing for an empty vault.
 */

interface Failure {
  code?: string
}

/** 23505 (a row already exists) and VLT01 (stale revision or key epoch) are conflicts. Anything else is a storage failure. */
function fail(error: Failure): never {
  throw new VaultError(error.code === '23505' || error.code === 'VLT01' ? 'conflict' : 'storage')
}

const metaRow = (meta: VaultMeta): Row => ({
  version: meta.version,
  revision: meta.revision,
  key_epoch: meta.keyEpoch,
  kdf: meta.kdf,
  wrapped_vk_by_password: meta.wrappedVkByPassword,
  wrapped_vk_by_recovery: meta.wrappedVkByRecovery,
  created_at: meta.createdAt,
  updated_at: meta.updatedAt,
})

const metaFromRow = (row: Row): unknown => ({
  version: row.version,
  revision: row.revision,
  keyEpoch: row.key_epoch,
  kdf: row.kdf,
  wrappedVkByPassword: row.wrapped_vk_by_password,
  wrappedVkByRecovery: row.wrapped_vk_by_recovery,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
})

const itemFromRow = (row: Row): unknown => ({
  id: row.id,
  v: row.v,
  iv: row.iv,
  ciphertext: row.ciphertext,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
})

const ITEM_COLUMNS = 'id,v,iv,ciphertext,created_at,updated_at'

export function createSupabaseVaultMetaRepo(): VaultMetaRepo {
  return {
    async get() {
      const { data, error } = await supabase().from('vault_meta').select('*').maybeSingle()
      if (error) fail(error)
      return data ? parseVaultMeta(metaFromRow(data as Row)) : null
    },
    async create(meta) {
      // A plain INSERT: a second setup hits the primary key and becomes `conflict`, it can never overwrite a vault.
      const { error } = await supabase().from('vault_meta').insert(metaRow(parseVaultMeta(meta)))
      if (error) fail(error)
    },
    async update(meta) {
      // Compare-and-swap in the database (revision must be stored + 1, key epoch may not go down). When a staged set for
      // the new epoch exists, it goes live in the same transaction, so the meta and the items never disagree on the key.
      const { error } = await supabase().rpc('vault_meta_update', { p_meta: parseVaultMeta(meta) })
      if (error) fail(error)
    },
    async overwrite(meta) {
      const { error } = await supabase().rpc('vault_meta_overwrite', { p_meta: parseVaultMeta(meta) })
      if (error) fail(error)
    },
  }
}

export function createSupabaseVaultItemRepo(): VaultItemRepo {
  const list = async (): Promise<EncryptedItem[]> => {
    const rows = await fetchAll<Row>((from, to) => supabase().from('vault_items').select(ITEM_COLUMNS).order('created_at').order('id').range(from, to)).catch(
      (error: Failure) => fail(error),
    )
    return parseEncryptedItems(rows.map(itemFromRow))
  }

  return {
    list,
    async get(id) {
      const { data, error } = await supabase().from('vault_items').select(ITEM_COLUMNS).eq('id', id).maybeSingle()
      if (error) fail(error)
      return data ? parseEncryptedItem(itemFromRow(data as Row)) : null
    },
    async put(item, keyEpoch) {
      const { error } = await supabase().rpc('vault_item_put', { p_item: parseEncryptedItem(item), p_epoch: keyEpoch })
      if (error) fail(error)
    },
    async remove(id, keyEpoch) {
      const { error } = await supabase().rpc('vault_item_remove', { p_id: id, p_epoch: keyEpoch })
      if (error) fail(error)
    },
    async restore(item, keyEpoch) {
      const { error } = await supabase().rpc('vault_item_restore', { p_item: parseEncryptedItem(item), p_epoch: keyEpoch })
      if (error) fail(error)
    },
    async stageReplace(items, keyEpoch) {
      const { error } = await supabase().rpc('vault_stage_replace', { p_items: parseEncryptedItems(items), p_epoch: keyEpoch })
      if (error) fail(error)
    },
    async settle(currentKeyEpoch) {
      const { error } = await supabase().rpc('vault_settle', { p_epoch: currentKeyEpoch })
      if (error) fail(error)
    },
    async discardStaged() {
      const { error } = await supabase().rpc('vault_discard_staged')
      if (error) fail(error)
    },
  }
}
