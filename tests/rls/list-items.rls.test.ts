import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  addMemberWithAdmin,
  createAuthenticatedUser,
  createOwnedList,
  deleteListWithAdmin,
  deleteUsers,
  hasItemWithContentId,
  listItemsByUser,
  type TestUser,
} from './helpers/supabaseTestClients'

interface ItemsFixture {
  users: TestUser[]
  owner: TestUser
  editor: TestUser
  viewer: TestUser
  outsider: TestUser
  listId: string
}

function uniqueContentId() {
  return Math.floor(Math.random() * 1000000)
}

async function createItemsFixture(): Promise<ItemsFixture> {
  const owner = await createAuthenticatedUser('owner-items')
  const editor = await createAuthenticatedUser('editor-items')
  const viewer = await createAuthenticatedUser('viewer-items')
  const outsider = await createAuthenticatedUser('outsider-items')

  const list = await createOwnedList(owner.client, `items-${randomUUID()}`)

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

async function teardownFixture(fixture: ItemsFixture): Promise<void> {
  await deleteListWithAdmin(fixture.listId)
  await deleteUsers(fixture.users)
}

describe.sequential('RLS: list_items policies', () => {
  it('allows owner and editor to manage items', async () => {
    const fixture = await createItemsFixture()

    try {
      const ownerContent = uniqueContentId()
      const ownerInsert = await fixture.owner.client.from('list_items').insert({
        list_id: fixture.listId,
        content_id: ownerContent,
        content_type: 'movie',
      })

      expect(ownerInsert.error).toBeNull()
      expect(await hasItemWithContentId(fixture.listId, ownerContent)).toBe(true)

      const editorContent = uniqueContentId()
      const editorInsert = await fixture.editor.client.from('list_items').insert({
        list_id: fixture.listId,
        content_id: editorContent,
        content_type: 'movie',
      })

      expect(editorInsert.error).toBeNull()
      expect(await hasItemWithContentId(fixture.listId, editorContent)).toBe(true)

      const editorDelete = await fixture.editor.client
        .from('list_items')
        .delete()
        .eq('list_id', fixture.listId)
        .eq('content_id', ownerContent)

      expect(editorDelete.error).toBeNull()
      expect(await hasItemWithContentId(fixture.listId, ownerContent)).toBe(false)
    } finally {
      await teardownFixture(fixture)
    }
  })

  it('prevents viewers from managing items', async () => {
    const fixture = await createItemsFixture()

    try {
      const ownerContent = uniqueContentId()
      const ownerInsert = await fixture.owner.client.from('list_items').insert({
        list_id: fixture.listId,
        content_id: ownerContent,
        content_type: 'movie',
      })
      expect(ownerInsert.error).toBeNull()

      const viewerContent = uniqueContentId()
      const viewerInsert = await fixture.viewer.client.from('list_items').insert({
        list_id: fixture.listId,
        content_id: viewerContent,
        content_type: 'movie',
      })

      if (viewerInsert.error) {
        expect(viewerInsert.error).not.toBeNull()
      }
      expect(await hasItemWithContentId(fixture.listId, viewerContent)).toBe(false)

      const viewerDelete = await fixture.viewer.client
        .from('list_items')
        .delete()
        .eq('list_id', fixture.listId)
        .eq('content_id', ownerContent)

      expect(viewerDelete.error).toBeNull()
      expect(await hasItemWithContentId(fixture.listId, ownerContent)).toBe(true)
    } finally {
      await teardownFixture(fixture)
    }
  })

  it('allows list members to read items and blocks non-members', async () => {
    const fixture = await createItemsFixture()

    try {
      const contentId = uniqueContentId()
      const ownerInsert = await fixture.owner.client.from('list_items').insert({
        list_id: fixture.listId,
        content_id: contentId,
        content_type: 'movie',
      })
      expect(ownerInsert.error).toBeNull()

      const ownerRead = await listItemsByUser(fixture.owner.client, fixture.listId)
      const editorRead = await listItemsByUser(fixture.editor.client, fixture.listId)
      const viewerRead = await listItemsByUser(fixture.viewer.client, fixture.listId)
      const outsiderRead = await listItemsByUser(fixture.outsider.client, fixture.listId)

      expect(ownerRead.error).toBeNull()
      expect(editorRead.error).toBeNull()
      expect(viewerRead.error).toBeNull()
      expect(outsiderRead.error).toBeNull()

      expect(ownerRead.data.length).toBeGreaterThan(0)
      expect(editorRead.data.length).toBeGreaterThan(0)
      expect(viewerRead.data.length).toBeGreaterThan(0)
      expect(outsiderRead.data).toHaveLength(0)
    } finally {
      await teardownFixture(fixture)
    }
  })
})
