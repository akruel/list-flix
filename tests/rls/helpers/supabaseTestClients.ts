import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getRequiredEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }

  throw new Error(`Missing required environment variable. Tried: ${names.join(', ')}`)
}

const supabaseUrl = getRequiredEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL'])
const anonKey = getRequiredEnv(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'ANON_KEY'])
const serviceRoleKey = getRequiredEnv([
  'SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE_KEY',
])

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}

export interface TestUser {
  id: string
  email: string
  password: string
  client: SupabaseClient
}

export const adminClient = createClient(supabaseUrl, serviceRoleKey, clientOptions)

export function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl, anonKey, clientOptions)
}

export async function createAuthenticatedUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@example.com`
  const password = `Passw0rd-${randomUUID().slice(0, 8)}`

  const createResult = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createResult.error || !createResult.data.user) {
    throw createResult.error ?? new Error('Failed to create test user')
  }

  const client = createAnonClient()
  const signInResult = await client.auth.signInWithPassword({ email, password })

  if (signInResult.error) {
    throw signInResult.error
  }

  return {
    id: createResult.data.user.id,
    email,
    password,
    client,
  }
}

export async function deleteUsers(users: TestUser[]): Promise<void> {
  for (const user of users) {
    await adminClient.auth.admin.deleteUser(user.id)
  }
}

export async function createOwnedList(
  ownerClient: SupabaseClient,
  name = `RLS-${randomUUID()}`,
): Promise<{ id: string; name: string }> {
  const { data, error } = await ownerClient
    .from('lists')
    .insert({ name })
    .select('id,name')
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to create list')
  }

  return data
}

export async function deleteListWithAdmin(listId: string): Promise<void> {
  const { error } = await adminClient.from('lists').delete().eq('id', listId)
  if (error) {
    throw error
  }
}

export async function addMemberWithAdmin(
  listId: string,
  userId: string,
  role: 'editor' | 'viewer',
  memberName?: string,
): Promise<void> {
  const { error } = await adminClient.from('list_members').insert({
    list_id: listId,
    user_id: userId,
    role,
    member_name: memberName,
  })

  if (error) {
    throw error
  }
}

export async function getMemberRole(
  listId: string,
  userId: string,
): Promise<'owner' | 'editor' | 'viewer' | null> {
  const { data, error } = await adminClient
    .from('list_members')
    .select('role')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data?.role as 'owner' | 'editor' | 'viewer' | undefined) ?? null
}

export async function listItemsByUser(client: SupabaseClient, listId: string) {
  const { data, error } = await client
    .from('list_items')
    .select('id,list_id,content_id,content_type')
    .eq('list_id', listId)

  return { data: data ?? [], error }
}

export async function hasItemWithContentId(listId: string, contentId: number): Promise<boolean> {
  const { data, error } = await adminClient
    .from('list_items')
    .select('id')
    .eq('list_id', listId)
    .eq('content_id', contentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}
