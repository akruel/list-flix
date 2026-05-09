import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  addMemberWithAdmin,
  createAnonClient,
  createAuthenticatedUser,
  createOwnedList,
  deleteListWithAdmin,
  deleteUsers,
  type TestUser,
} from "./helpers/supabaseTestClients";

interface ListsFixture {
  users: TestUser[];
  owner: TestUser;
  editor: TestUser;
  viewer: TestUser;
  outsider: TestUser;
  listId: string;
  listName: string;
}

async function createListsFixture(): Promise<ListsFixture> {
  const owner = await createAuthenticatedUser("lists-owner");
  const editor = await createAuthenticatedUser("lists-editor");
  const viewer = await createAuthenticatedUser("lists-viewer");
  const outsider = await createAuthenticatedUser("lists-outsider");

  const list = await createOwnedList(owner.client, `lists-${randomUUID()}`);

  await addMemberWithAdmin(list.id, editor.id, "editor", "Editor");
  await addMemberWithAdmin(list.id, viewer.id, "viewer", "Viewer");

  return {
    users: [owner, editor, viewer, outsider],
    owner,
    editor,
    viewer,
    outsider,
    listId: list.id,
    listName: list.name,
  };
}

async function teardownFixture(fixture: ListsFixture): Promise<void> {
  await deleteListWithAdmin(fixture.listId);
  await deleteUsers(fixture.users);
}

describe.sequential("RLS: lists policies", () => {
  it("allows owner, editor, and viewer to select the list, but not outsider", async () => {
    const fixture = await createListsFixture();

    try {
      const ownerSelect = await fixture.owner.client
        .from("lists")
        .select("id,name")
        .eq("id", fixture.listId)
        .single();

      expect(ownerSelect.error).toBeNull();
      expect(ownerSelect.data).not.toBeNull();
      expect(ownerSelect.data?.id).toBe(fixture.listId);

      const editorSelect = await fixture.editor.client
        .from("lists")
        .select("id,name")
        .eq("id", fixture.listId)
        .single();

      expect(editorSelect.error).toBeNull();
      expect(editorSelect.data).not.toBeNull();

      const viewerSelect = await fixture.viewer.client
        .from("lists")
        .select("id,name")
        .eq("id", fixture.listId)
        .single();

      expect(viewerSelect.error).toBeNull();
      expect(viewerSelect.data).not.toBeNull();

      const outsiderSelect = await fixture.outsider.client
        .from("lists")
        .select("id,name")
        .eq("id", fixture.listId)
        .single();

      expect(outsiderSelect.error).not.toBeNull();
      expect(outsiderSelect.data).toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents anonymous users from creating lists", async () => {
    const anonClient = createAnonClient();
    const insertResult = await anonClient
      .from("lists")
      .insert({ name: `anon-${randomUUID()}` })
      .select("id")
      .single();

    expect(insertResult.error).not.toBeNull();
  });

  it("allows only the owner to update the list name", async () => {
    const fixture = await createListsFixture();

    try {
      const newName = `updated-${randomUUID()}`;

      const ownerUpdate = await fixture.owner.client
        .from("lists")
        .update({ name: newName })
        .eq("id", fixture.listId)
        .select("name")
        .single();

      expect(ownerUpdate.error).toBeNull();
      expect(ownerUpdate.data?.name).toBe(newName);

      const editorUpdate = await fixture.editor.client
        .from("lists")
        .update({ name: `editor-${randomUUID()}` })
        .eq("id", fixture.listId)
        .select("name")
        .single();

      expect(editorUpdate.error).not.toBeNull();

      const viewerUpdate = await fixture.viewer.client
        .from("lists")
        .update({ name: `viewer-${randomUUID()}` })
        .eq("id", fixture.listId)
        .select("name")
        .single();

      expect(viewerUpdate.error).not.toBeNull();

      const outsiderUpdate = await fixture.outsider.client
        .from("lists")
        .update({ name: `outsider-${randomUUID()}` })
        .eq("id", fixture.listId)
        .select("name")
        .single();

      expect(outsiderUpdate.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("allows only the owner to delete the list", async () => {
    const fixture = await createListsFixture();

    try {
      const editorDelete = await fixture.editor.client
        .from("lists")
        .delete()
        .eq("id", fixture.listId);

      expect(editorDelete.error).toBeNull();

      const stillExistsAfterEditor = await fixture.owner.client
        .from("lists")
        .select("id")
        .eq("id", fixture.listId)
        .single();

      expect(stillExistsAfterEditor.error).toBeNull();

      const viewerDelete = await fixture.viewer.client
        .from("lists")
        .delete()
        .eq("id", fixture.listId);

      expect(viewerDelete.error).toBeNull();

      const stillExistsAfterViewer = await fixture.owner.client
        .from("lists")
        .select("id")
        .eq("id", fixture.listId)
        .single();

      expect(stillExistsAfterViewer.error).toBeNull();

      const outsiderDelete = await fixture.outsider.client
        .from("lists")
        .delete()
        .eq("id", fixture.listId);

      expect(outsiderDelete.error).toBeNull();

      const stillExistsAfterOutsider = await fixture.owner.client
        .from("lists")
        .select("id")
        .eq("id", fixture.listId)
        .single();

      expect(stillExistsAfterOutsider.error).toBeNull();

      const ownerDelete = await fixture.owner.client
        .from("lists")
        .delete()
        .eq("id", fixture.listId);

      expect(ownerDelete.error).toBeNull();

      const confirmDeleted = await fixture.owner.client
        .from("lists")
        .select("id")
        .eq("id", fixture.listId)
        .single();

      expect(confirmDeleted.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });
});
