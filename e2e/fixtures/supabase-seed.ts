import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getRequiredEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }

  throw new Error(`Missing required environment variable. Tried: ${names.join(', ')}`)
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}

interface SeedClients {
  supabaseUrl: string
  anonKey: string
  adminClient: SupabaseClient
}

let cachedSeedClients: SeedClients | null = null

function getSeedClients(): SeedClients {
  if (cachedSeedClients) {
    return cachedSeedClients
  }

  const supabaseUrl = getRequiredEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL'])
  const anonKey = getRequiredEnv(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'ANON_KEY'])
  const serviceRoleKey = getRequiredEnv(['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY'])

  cachedSeedClients = {
    supabaseUrl,
    anonKey,
    adminClient: createClient(supabaseUrl, serviceRoleKey, clientOptions),
  }

  return cachedSeedClients
}

function createAnonClient(): SupabaseClient {
  const { supabaseUrl, anonKey } = getSeedClients()
  return createClient(supabaseUrl, anonKey, clientOptions)
}

export interface SeededUser {
  id: string
  email: string
  password: string
}

export interface SeededList {
  id: string
  name: string
  ownerId: string
}

export interface SeedCleanup {
  users: SeededUser[]
  listIds: string[]
  run: () => Promise<void>
}

export function createSeedCleanup(): SeedCleanup {
  const users: SeededUser[] = []
  const listIds: string[] = []

  return {
    users,
    listIds,
    run: async () => {
      const { adminClient } = getSeedClients()

      for (const listId of Array.from(new Set(listIds)).reverse()) {
        const { error } = await adminClient.from('lists').delete().eq('id', listId)
        if (error) {
          throw error
        }
      }

      for (const user of Array.from(new Map(users.map((entry) => [entry.id, entry])).values()).reverse()) {
        const { error } = await adminClient.auth.admin.deleteUser(user.id)
        if (error) {
          throw error
        }
      }
    },
  }
}

export async function createSeededUser(label: string): Promise<SeededUser> {
  const { adminClient } = getSeedClients()
  const email = `${label}-${randomUUID()}@example.com`
  const password = `Passw0rd-${randomUUID().slice(0, 8)}`

  const createUserResult = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createUserResult.error || !createUserResult.data.user) {
    throw createUserResult.error ?? new Error('Failed to create seeded user')
  }

  return {
    id: createUserResult.data.user.id,
    email,
    password,
  }
}

export async function createSeededListForOwner(owner: SeededUser, name?: string): Promise<SeededList> {
  const ownerClient = createAnonClient()

  const signInResult = await ownerClient.auth.signInWithPassword({
    email: owner.email,
    password: owner.password,
  })

  if (signInResult.error) {
    throw signInResult.error
  }

  const listName = name ?? `E2E List ${randomUUID().slice(0, 8)}`

  const insertResult = await ownerClient
    .from('lists')
    .insert({ name: listName })
    .select('id,name')
    .single()

  if (insertResult.error || !insertResult.data) {
    throw insertResult.error ?? new Error('Failed to create seeded list')
  }

  return {
    id: insertResult.data.id,
    name: insertResult.data.name,
    ownerId: owner.id,
  }
}

export async function seedListOwnedByNewUser(
  label: string,
  listName?: string,
): Promise<{ owner: SeededUser; list: SeededList; cleanup: SeedCleanup }> {
  const cleanup = createSeedCleanup()
  const owner = await createSeededUser(label)
  cleanup.users.push(owner)

  const list = await createSeededListForOwner(owner, listName)
  cleanup.listIds.push(list.id)

  return {
    owner,
    list,
    cleanup,
  }
}
