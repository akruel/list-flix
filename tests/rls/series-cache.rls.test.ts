import { describe, expect, it } from "vitest";

import {
  createAuthenticatedUser,
  createPublicClient,
  deleteUsers,
} from "./helpers/supabaseTestClients";

describe.sequential("RLS: series_cache policies", () => {
  it("allows anyone (including anonymous) to read series_cache", async () => {
    const anonClient = createPublicClient();
    const selectResult = await anonClient
      .from("series_cache")
      .select("tmdb_id")
      .limit(1);

    expect(selectResult.error).toBeNull();
    expect(Array.isArray(selectResult.data)).toBe(true);
  });

  it("allows authenticated users to insert into series_cache", async () => {
    const user = await createAuthenticatedUser("sc-insert");

    try {
      const tmdbId = Math.floor(Math.random() * 100000) + 1;
      const insertResult = await user.client.from("series_cache").insert({
        tmdb_id: tmdbId,
        total_episodes: 10,
        number_of_seasons: 2,
      });

      expect(insertResult.error).toBeNull();
    } finally {
      await deleteUsers([user]);
    }
  });

  it("prevents anonymous users from inserting into series_cache", async () => {
    const anonClient = createPublicClient();
    const insertResult = await anonClient.from("series_cache").insert({
      tmdb_id: Math.floor(Math.random() * 100000) + 1,
      total_episodes: 10,
      number_of_seasons: 2,
    });

    expect(insertResult.error).not.toBeNull();
  });

  it("allows authenticated users to update series_cache", async () => {
    const user = await createAuthenticatedUser("sc-update");

    try {
      const tmdbId = Math.floor(Math.random() * 100000) + 1;

      const insertResult = await user.client.from("series_cache").insert({
        tmdb_id: tmdbId,
        total_episodes: 10,
        number_of_seasons: 2,
      });

      expect(insertResult.error).toBeNull();

      const updateResult = await user.client
        .from("series_cache")
        .update({ total_episodes: 15 })
        .eq("tmdb_id", tmdbId);

      expect(updateResult.error).toBeNull();
    } finally {
      await deleteUsers([user]);
    }
  });

  it("prevents anonymous users from updating series_cache", async () => {
    const user = await createAuthenticatedUser("sc-anon-update");

    try {
      const tmdbId = Math.floor(Math.random() * 100000) + 1;

      const insertResult = await user.client.from("series_cache").insert({
        tmdb_id: tmdbId,
        total_episodes: 10,
        number_of_seasons: 2,
      });

      expect(insertResult.error).toBeNull();

      const anonClient = createPublicClient();
      const anonUpdate = await anonClient
        .from("series_cache")
        .update({ total_episodes: 99 })
        .eq("tmdb_id", tmdbId);

      expect(anonUpdate.error).toBeNull();

      const verify = await user.client
        .from("series_cache")
        .select("total_episodes")
        .eq("tmdb_id", tmdbId)
        .single();

      expect(verify.error).toBeNull();
      expect(verify.data?.total_episodes).toBe(10);
    } finally {
      await deleteUsers([user]);
    }
  });
});
