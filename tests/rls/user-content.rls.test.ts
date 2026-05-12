import { describe, expect, it } from "vitest";

import {
  createAuthenticatedUser,
  deleteUsers,
  type TestUser,
} from "./helpers/supabaseTestClients";

interface UserContentFixture {
  users: TestUser[];
  userA: TestUser;
  userB: TestUser;
  userListTmdbId: number;
  movieTmdbId: number;
  episodeTmdbId: number;
  showTmdbId: number;
  userListItemId: string;
}

async function createUserContentFixture(): Promise<UserContentFixture> {
  const userA = await createAuthenticatedUser("user-content-a");
  const userB = await createAuthenticatedUser("user-content-b");

  const userListTmdbId = Math.floor(Math.random() * 100000) + 1;
  const movieTmdbId = Math.floor(Math.random() * 100000) + 1;
  const episodeTmdbId = Math.floor(Math.random() * 100000) + 1;
  const showTmdbId = Math.floor(Math.random() * 100000) + 1;

  const insertList = await userA.client
    .from("user_list")
    .insert({
      tmdb_id: userListTmdbId,
      media_type: "movie",
      title: "Test Movie",
    })
    .select()
    .single();

  if (insertList.error) throw insertList.error;

  const insertWatchedMovie = await userA.client.from("watched_movies").insert({
    tmdb_id: movieTmdbId,
  });

  if (insertWatchedMovie.error) throw insertWatchedMovie.error;

  const insertWatchedEpisode = await userA.client
    .from("watched_episodes")
    .insert({
      tmdb_episode_id: episodeTmdbId,
      tmdb_show_id: showTmdbId,
      season_number: 1,
      episode_number: 1,
    });

  if (insertWatchedEpisode.error) throw insertWatchedEpisode.error;

  return {
    users: [userA, userB],
    userA,
    userB,
    userListTmdbId,
    movieTmdbId,
    episodeTmdbId,
    showTmdbId,
    userListItemId: insertList.data.id,
  };
}

async function teardownFixture(fixture: UserContentFixture): Promise<void> {
  await deleteUsers(fixture.users);
}

describe.sequential("RLS: user_list policies", () => {
  it("allows user to view and delete their own list entries, blocks other users", async () => {
    const fixture = await createUserContentFixture();

    try {
      const ownSelect = await fixture.userA.client
        .from("user_list")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.userListTmdbId)
        .single();

      expect(ownSelect.error).toBeNull();
      expect(ownSelect.data).not.toBeNull();

      const otherSelect = await fixture.userB.client
        .from("user_list")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.userListTmdbId)
        .single();

      expect(otherSelect.error).not.toBeNull();
      expect(otherSelect.data).toBeNull();

      const ownDelete = await fixture.userA.client
        .from("user_list")
        .delete()
        .eq("tmdb_id", fixture.userListTmdbId);

      expect(ownDelete.error).toBeNull();

      const confirmDeleted = await fixture.userA.client
        .from("user_list")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.userListTmdbId)
        .single();

      expect(confirmDeleted.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from inserting on behalf of another user", async () => {
    const fixture = await createUserContentFixture();

    try {
      const insertForOther = await fixture.userB.client
        .from("user_list")
        .insert({
          user_id: fixture.userA.id,
          tmdb_id: Math.floor(Math.random() * 100000),
          media_type: "movie",
        });

      expect(insertForOther.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from deleting another users list entry", async () => {
    const fixture = await createUserContentFixture();

    try {
      const otherDelete = await fixture.userB.client
        .from("user_list")
        .delete()
        .eq("tmdb_id", fixture.userListTmdbId);

      expect(otherDelete.error).toBeNull();

      const stillExists = await fixture.userA.client
        .from("user_list")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.userListTmdbId)
        .single();

      expect(stillExists.error).toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("allows user to update their own list entry", async () => {
    const fixture = await createUserContentFixture();

    try {
      const ownUpdate = await fixture.userA.client
        .from("user_list")
        .update({ title: "Updated Title" })
        .eq("tmdb_id", fixture.userListTmdbId);

      expect(ownUpdate.error).toBeNull();

      const otherUpdate = await fixture.userB.client
        .from("user_list")
        .update({ title: "Hacked" })
        .eq("tmdb_id", fixture.userListTmdbId);

      expect(otherUpdate.error).toBeNull();

      const confirmNotChanged = await fixture.userA.client
        .from("user_list")
        .select("title")
        .eq("tmdb_id", fixture.userListTmdbId)
        .single();

      expect(confirmNotChanged.data?.title).toBe("Updated Title");
    } finally {
      await teardownFixture(fixture);
    }
  });
});

describe.sequential("RLS: user_list_tags policies", () => {
  it("allows user to manage tags on their own items, blocks other users", async () => {
    const fixture = await createUserContentFixture();

    try {
      const insertTag = await fixture.userA.client
        .from("user_list_tags")
        .insert({
          user_list_id: fixture.userListItemId,
          tag: "noite_de_pipoca",
        });

      expect(insertTag.error).toBeNull();

      const ownSelect = await fixture.userA.client
        .from("user_list_tags")
        .select("*")
        .eq("user_list_id", fixture.userListItemId);

      expect(ownSelect.error).toBeNull();
      expect(ownSelect.data).toHaveLength(1);

      const otherSelect = await fixture.userB.client
        .from("user_list_tags")
        .select("*")
        .eq("user_list_id", fixture.userListItemId);

      expect(otherSelect.error).toBeNull();
      expect(otherSelect.data).toHaveLength(0);

      const ownDelete = await fixture.userA.client
        .from("user_list_tags")
        .delete()
        .eq("user_list_id", fixture.userListItemId)
        .eq("tag", "noite_de_pipoca");

      expect(ownDelete.error).toBeNull();

      const confirmDeleted = await fixture.userA.client
        .from("user_list_tags")
        .select("*")
        .eq("user_list_id", fixture.userListItemId);

      expect(confirmDeleted.error).toBeNull();
      expect(confirmDeleted.data).toHaveLength(0);
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from inserting tag on another users item", async () => {
    const fixture = await createUserContentFixture();

    try {
      const insertForOther = await fixture.userB.client
        .from("user_list_tags")
        .insert({
          user_list_id: fixture.userListItemId,
          tag: "noite_de_pipoca",
        });

      expect(insertForOther.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });
});

describe.sequential("RLS: watched_movies policies", () => {
  it("allows user to view and delete their own watched movies, blocks other users", async () => {
    const fixture = await createUserContentFixture();

    try {
      const ownSelect = await fixture.userA.client
        .from("watched_movies")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.movieTmdbId)
        .single();

      expect(ownSelect.error).toBeNull();
      expect(ownSelect.data).not.toBeNull();

      const otherSelect = await fixture.userB.client
        .from("watched_movies")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.movieTmdbId)
        .single();

      expect(otherSelect.error).not.toBeNull();
      expect(otherSelect.data).toBeNull();

      const ownDelete = await fixture.userA.client
        .from("watched_movies")
        .delete()
        .eq("tmdb_id", fixture.movieTmdbId);

      expect(ownDelete.error).toBeNull();

      const confirmDeleted = await fixture.userA.client
        .from("watched_movies")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.movieTmdbId)
        .single();

      expect(confirmDeleted.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from inserting watched movie on behalf of another user", async () => {
    const fixture = await createUserContentFixture();

    try {
      const insertForOther = await fixture.userB.client
        .from("watched_movies")
        .insert({
          user_id: fixture.userA.id,
          tmdb_id: Math.floor(Math.random() * 100000),
        });

      expect(insertForOther.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from deleting another users watched movie", async () => {
    const fixture = await createUserContentFixture();

    try {
      const otherDelete = await fixture.userB.client
        .from("watched_movies")
        .delete()
        .eq("tmdb_id", fixture.movieTmdbId);

      expect(otherDelete.error).toBeNull();

      const stillExists = await fixture.userA.client
        .from("watched_movies")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.movieTmdbId)
        .single();

      expect(stillExists.error).toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });
});

describe.sequential("RLS: watched_episodes policies", () => {
  it("allows user to view and delete their own watched episodes, blocks other users", async () => {
    const fixture = await createUserContentFixture();

    try {
      const ownSelect = await fixture.userA.client
        .from("watched_episodes")
        .select("tmdb_episode_id")
        .eq("tmdb_episode_id", fixture.episodeTmdbId)
        .single();

      expect(ownSelect.error).toBeNull();
      expect(ownSelect.data).not.toBeNull();

      const otherSelect = await fixture.userB.client
        .from("watched_episodes")
        .select("tmdb_episode_id")
        .eq("tmdb_episode_id", fixture.episodeTmdbId)
        .single();

      expect(otherSelect.error).not.toBeNull();
      expect(otherSelect.data).toBeNull();

      const ownDelete = await fixture.userA.client
        .from("watched_episodes")
        .delete()
        .eq("tmdb_episode_id", fixture.episodeTmdbId);

      expect(ownDelete.error).toBeNull();

      const confirmDeleted = await fixture.userA.client
        .from("watched_episodes")
        .select("tmdb_episode_id")
        .eq("tmdb_episode_id", fixture.episodeTmdbId)
        .single();

      expect(confirmDeleted.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from inserting watched episode on behalf of another user", async () => {
    const fixture = await createUserContentFixture();

    try {
      const insertForOther = await fixture.userB.client
        .from("watched_episodes")
        .insert({
          user_id: fixture.userA.id,
          tmdb_episode_id: Math.floor(Math.random() * 100000),
          tmdb_show_id: Math.floor(Math.random() * 100000),
          season_number: 1,
          episode_number: 1,
        });

      expect(insertForOther.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from deleting another users watched episode", async () => {
    const fixture = await createUserContentFixture();

    try {
      const otherDelete = await fixture.userB.client
        .from("watched_episodes")
        .delete()
        .eq("tmdb_episode_id", fixture.episodeTmdbId);

      expect(otherDelete.error).toBeNull();

      const stillExists = await fixture.userA.client
        .from("watched_episodes")
        .select("tmdb_episode_id")
        .eq("tmdb_episode_id", fixture.episodeTmdbId)
        .single();

      expect(stillExists.error).toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });
});
