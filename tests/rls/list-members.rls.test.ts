import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  addMemberWithAdmin,
  createAuthenticatedUser,
  createOwnedList,
  deleteListWithAdmin,
  deleteUsers,
  getMemberRole,
  type TestUser,
} from './helpers/supabaseTestClients'

interface MembersFixture {
  users: TestUser[]
  owner: TestUser
  editor: TestUser
  viewer: TestUser
  outsider: TestUser
  listId: string
}

async function createMembersFixture(): Promise<MembersFixture> {
  const owner = await createAuthenticatedUser('owner')
  const editor = await createAuthenticatedUser('editor')
  const viewer = await createAuthenticatedUser('viewer')
  const outsider = await createAuthenticatedUser('outsider')

  const list = await createOwnedList(owner.client, `members-${randomUUID()}`)

  await addMemberWithAdmin(list.id, editor.id, 'editor', 'Editor')
  await addMemberWithAdmin(list.id, viewer.id, 'viewer', 'Viewer')

  return {
    users: [owner, editor, viewer, outsider],
    owner,
    editor,
    viewer,
    outsider,
    listId: list.id,
  }
}

async function teardownFixture(fixture: MembersFixture): Promise<void> {
  await deleteListWithAdmin(fixture.listId)
  await deleteUsers(fixture.users)
}

describe.sequential('RLS: list_members policies', () => {
  it('allows joining as viewer/editor and blocks joining as owner', async () => {
    const fixture = await createMembersFixture()

    try {
      const joinAsViewer = await fixture.outsider.client.from('list_members').insert({
        list_id: fixture.listId,
        user_id: fixture.outsider.id,
        role: 'viewer',
        member_name: 'Join Viewer',
      })

      expect(joinAsViewer.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.outsider.id)).toBe('viewer')

      const outsiderOwner = await createAuthenticatedUser('outsider-owner')
      fixture.users.push(outsiderOwner)

      const joinAsOwner = await outsiderOwner.client.from('list_members').insert({
        list_id: fixture.listId,
        user_id: outsiderOwner.id,
        role: 'owner',
        member_name: 'Forbidden Owner',
      })

      expect(joinAsOwner.error).not.toBeNull()
      expect(await getMemberRole(fixture.listId, outsiderOwner.id)).toBeNull()
    } finally {
      await teardownFixture(fixture)
    }
  })

  it('allows owner to remove editor/viewer but not owner', async () => {
    const fixture = await createMembersFixture()

    try {
      const removeViewer = await fixture.owner.client
        .from('list_members')
        .delete()
        .eq('list_id', fixture.listId)
        .eq('user_id', fixture.viewer.id)

      expect(removeViewer.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.viewer.id)).toBeNull()

      const removeOwner = await fixture.owner.client
        .from('list_members')
        .delete()
        .eq('list_id', fixture.listId)
        .eq('user_id', fixture.owner.id)

      expect(removeOwner.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.owner.id)).toBe('owner')
    } finally {
      await teardownFixture(fixture)
    }
  })

  it('allows owner to update roles between viewer and editor', async () => {
    const fixture = await createMembersFixture()

    try {
      const promote = await fixture.owner.client
        .from('list_members')
        .update({ role: 'editor' })
        .eq('list_id', fixture.listId)
        .eq('user_id', fixture.viewer.id)

      expect(promote.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.viewer.id)).toBe('editor')

      const demote = await fixture.owner.client
        .from('list_members')
        .update({ role: 'viewer' })
        .eq('list_id', fixture.listId)
        .eq('user_id', fixture.viewer.id)

      expect(demote.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.viewer.id)).toBe('viewer')
    } finally {
      await teardownFixture(fixture)
    }
  })

  it('prevents non-owner users from managing members', async () => {
    const fixture = await createMembersFixture()

    try {
      const updateAttempt = await fixture.viewer.client
        .from('list_members')
        .update({ role: 'viewer' })
        .eq('list_id', fixture.listId)
        .eq('user_id', fixture.editor.id)

      expect(updateAttempt.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.editor.id)).toBe('editor')

      const deleteAttempt = await fixture.viewer.client
        .from('list_members')
        .delete()
        .eq('list_id', fixture.listId)
        .eq('user_id', fixture.editor.id)

      expect(deleteAttempt.error).toBeNull()
      expect(await getMemberRole(fixture.listId, fixture.editor.id)).toBe('editor')
    } finally {
      await teardownFixture(fixture)
    }
  })
})
