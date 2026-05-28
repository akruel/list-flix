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
  watchlistTmdbId: number;
  movieTmdbId: number;
  episodeTmdbId: number;
  showTmdbId: number;
}

async function createUserContentFixture(): Promise<UserContentFixture> {
  const userA = await createAuthenticatedUser("user-content-a");
  const userB = await createAuthenticatedUser("user-content-b");

  const watchlistTmdbId = Math.floor(Math.random() * 100000) + 1;
  const movieTmdbId = Math.floor(Math.random() * 100000) + 1;
  const episodeTmdbId = Math.floor(Math.random() * 100000) + 1;
  const showTmdbId = Math.floor(Math.random() * 100000) + 1;

  const insertWatchlist = await userA.client.from("watchlists").insert({
    tmdb_id: watchlistTmdbId,
    media_type: "movie",
    title: "Watchlist movie",
  });

  if (insertWatchlist.error) throw insertWatchlist.error;

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
    watchlistTmdbId,
    movieTmdbId,
    episodeTmdbId,
    showTmdbId,
  };
}

async function teardownFixture(fixture: UserContentFixture): Promise<void> {
  await deleteUsers(fixture.users);
}

describe.sequential("RLS: watchlists policies", () => {
  it("allows user to view and delete their own watchlist entries, blocks other users", async () => {
    const fixture = await createUserContentFixture();

    try {
      const ownSelect = await fixture.userA.client
        .from("watchlists")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.watchlistTmdbId)
        .single();

      expect(ownSelect.error).toBeNull();
      expect(ownSelect.data).not.toBeNull();

      const otherSelect = await fixture.userB.client
        .from("watchlists")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.watchlistTmdbId)
        .single();

      expect(otherSelect.error).not.toBeNull();
      expect(otherSelect.data).toBeNull();

      const ownDelete = await fixture.userA.client
        .from("watchlists")
        .delete()
        .eq("tmdb_id", fixture.watchlistTmdbId);

      expect(ownDelete.error).toBeNull();

      const confirmDeleted = await fixture.userA.client
        .from("watchlists")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.watchlistTmdbId)
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
        .from("watchlists")
        .insert({
          user_id: fixture.userA.id,
          tmdb_id: Math.floor(Math.random() * 100000),
          media_type: "movie",
          title: "Cross-user attempt",
        });

      expect(insertForOther.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("prevents user from deleting another users watchlist entry", async () => {
    const fixture = await createUserContentFixture();

    try {
      const otherDelete = await fixture.userB.client
        .from("watchlists")
        .delete()
        .eq("tmdb_id", fixture.watchlistTmdbId);

      expect(otherDelete.error).toBeNull();

      const stillExists = await fixture.userA.client
        .from("watchlists")
        .select("tmdb_id")
        .eq("tmdb_id", fixture.watchlistTmdbId)
        .single();

      expect(stillExists.error).toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("rejects inserts with no title or name (metadata constraint)", async () => {
    const fixture = await createUserContentFixture();

    try {
      const missingMetadata = await fixture.userA.client
        .from("watchlists")
        .insert({
          tmdb_id: Math.floor(Math.random() * 100000) + 1_000_000,
          media_type: "movie",
        });

      expect(missingMetadata.error).not.toBeNull();
      expect(missingMetadata.error?.message).toMatch(
        /watchlists_metadata_required/i,
      );

      const blankMetadata = await fixture.userA.client
        .from("watchlists")
        .insert({
          tmdb_id: Math.floor(Math.random() * 100000) + 2_000_000,
          media_type: "tv",
          title: "",
          name: "",
        });

      expect(blankMetadata.error).not.toBeNull();
    } finally {
      await teardownFixture(fixture);
    }
  });

  it("accepts inserts with name only (tv) or title only (movie)", async () => {
    const fixture = await createUserContentFixture();

    try {
      const tmdbIdMovie = Math.floor(Math.random() * 100000) + 3_000_000;
      const movieInsert = await fixture.userA.client
        .from("watchlists")
        .insert({ tmdb_id: tmdbIdMovie, media_type: "movie", title: "Movie" });
      expect(movieInsert.error).toBeNull();

      const tmdbIdShow = Math.floor(Math.random() * 100000) + 4_000_000;
      const tvInsert = await fixture.userA.client
        .from("watchlists")
        .insert({ tmdb_id: tmdbIdShow, media_type: "tv", name: "Show" });
      expect(tvInsert.error).toBeNull();
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
