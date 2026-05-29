import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  addMemberWithAdmin,
  createAuthenticatedUser,
  createOwnedList,
  createPublicClient,
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

type ListRole = "owner" | "editor" | "viewer" | "outsider";

const listSelectAllowedRoles: ListRole[] = ["owner", "editor", "viewer"];
const listUpdateDeniedRoles: ListRole[] = ["editor", "viewer", "outsider"];

describe.sequential("RLS: lists policies", () => {
  it.each(listSelectAllowedRoles)(
    "allows %s to select the list",
    async (role) => {
      const fixture = await createListsFixture();

      try {
        const result = await fixture[role].client
          .from("lists")
          .select("id,name")
          .eq("id", fixture.listId)
          .single();

        expect(result.error).toBeNull();
        expect(result.data).not.toBeNull();
        expect(result.data?.id).toBe(fixture.listId);
      } finally {
        await teardownFixture(fixture);
      }
    },
  );

  it("blocks outsider from selecting the list", async () => {
    const fixture = await createListsFixture();

    try {
      const result = await fixture.outsider.client
        .from("lists")
        .select("id,name")
        .eq("id", fixture.listId)
        .single();

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents anonymous users from creating lists", async () => {
    const anonClient = createPublicClient();
    const insertResult = await anonClient
      .from("lists")
      .insert({ name: `anon-${randomUUID()}` })
      .select("id")
      .single();

    expect(insertResult.error).not.toBeNull();
  });

  it("allows owner to update the list name", async () => {
    const fixture = await createListsFixture();

    try {
      const newName = `updated-${randomUUID()}`;

      const result = await fixture.owner.client
        .from("lists")
        .update({ name: newName })
        .eq("id", fixture.listId)
        .select("name")
        .single();

      expect(result.error).toBeNull();
      expect(result.data?.name).toBe(newName);
    } finally {
      await teardownFixture(fixture);
    }
  });

  it.each(listUpdateDeniedRoles)(
    "blocks %s from updating the list name",
    async (role) => {
      const fixture = await createListsFixture();

      try {
        const result = await fixture[role].client
          .from("lists")
          .update({ name: `${role}-${randomUUID()}` })
          .eq("id", fixture.listId)
          .select("name")
          .single();

        expect(result.error).not.toBeNull();
      } finally {
        await teardownFixture(fixture);
      }
    },
  );

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
