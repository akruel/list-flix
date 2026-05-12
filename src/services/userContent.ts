import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";
import type {
  ContentItem,
  Episode,
  SeriesMetadata,
  UserListItem,
  UserListTagType,
  WatchedEpisodeMetadata,
} from "../types";
import { tmdb } from "./tmdb";

export type TagInput = { tag: UserListTagType; partner_user_id?: string };

export type ContentType = "movie" | "tv" | "episode";

export const userContentService = {
  async syncLocalData(
    localList: ContentItem[],
    localWatchedIds: number[],
    localWatchedEpisodes: Record<
      number,
      Record<number, WatchedEpisodeMetadata>
    > = {},
    localTags: Record<number, TagInput[]> = {},
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: userListData },
      { data: watchedMoviesData },
      { data: watchedEpisodesData },
    ] = await Promise.all([
      supabase.from("user_list").select("tmdb_id"),
      supabase.from("watched_movies").select("tmdb_id"),
      supabase.from("watched_episodes").select("tmdb_episode_id"),
    ]);

    const existingList = new Set(userListData?.map((i) => i.tmdb_id));
    const existingWatchedMovies = new Set(
      watchedMoviesData?.map((i) => i.tmdb_id),
    );
    const existingWatchedEpisodes = new Set(
      watchedEpisodesData?.map((i) => i.tmdb_episode_id),
    );

    const listUpdates = [];
    const watchedMoviesUpdates = [];
    const watchedEpisodesUpdates = [];

    for (const item of localList) {
      if (!existingList.has(item.id)) {
        listUpdates.push({
          user_id: user.id,
          tmdb_id: item.id,
          media_type: item.media_type,
          title: item.title,
          name: item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          overview: item.overview,
        });
      }
    }

    for (const id of localWatchedIds) {
      if (!existingWatchedMovies.has(id)) {
        watchedMoviesUpdates.push({
          user_id: user.id,
          tmdb_id: id,
        });
      }
    }

    for (const [showId, episodesMap] of Object.entries(localWatchedEpisodes)) {
      for (const [episodeId, metadata] of Object.entries(episodesMap)) {
        if (!existingWatchedEpisodes.has(Number(episodeId))) {
          watchedEpisodesUpdates.push({
            user_id: user.id,
            tmdb_episode_id: Number(episodeId),
            tmdb_show_id: Number(showId),
            season_number: metadata.season_number,
            episode_number: metadata.episode_number,
          });
        }
      }
    }

    if (listUpdates.length > 0) {
      const { data: insertedItems, error } = await supabase
        .from("user_list")
        .insert(listUpdates)
        .select("id, tmdb_id");

      if (error) {
        logger.error("Error syncing list data:", error);
      } else if (insertedItems) {
        const tagInserts: {
          user_list_id: string;
          tag: UserListTagType;
          partner_user_id?: string;
        }[] = [];
        for (const item of insertedItems) {
          const tags = localTags[item.tmdb_id];
          if (tags) {
            for (const t of tags) {
              tagInserts.push({
                user_list_id: item.id,
                tag: t.tag,
                partner_user_id: t.partner_user_id,
              });
            }
          }
        }
        if (tagInserts.length > 0) {
          const { error: tagError } = await supabase
            .from("user_list_tags")
            .insert(tagInserts);
          if (tagError) logger.error("Error syncing tags:", tagError);
        }
      }
    }

    const promises = [];
    if (watchedMoviesUpdates.length > 0) {
      promises.push(
        supabase.from("watched_movies").insert(watchedMoviesUpdates),
      );
    }
    if (watchedEpisodesUpdates.length > 0) {
      promises.push(
        supabase.from("watched_episodes").insert(watchedEpisodesUpdates),
      );
    }

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      results.forEach(({ error }) => {
        if (error) logger.error("Error syncing data:", error);
      });
    }
  },

  async getUserContent() {
    const [
      { data: userListData, error: userListError },
      { data: watchedMoviesData, error: watchedMoviesError },
      { data: watchedEpisodesData, error: watchedEpisodesError },
      { data: seriesCacheData, error: seriesCacheError },
    ] = await Promise.all([
      supabase.from("user_list").select("*, user_list_tags(*)"),
      supabase.from("watched_movies").select("*"),
      supabase.from("watched_episodes").select("*"),
      supabase.from("series_cache").select("*"),
    ]);

    if (
      userListError ||
      watchedMoviesError ||
      watchedEpisodesError ||
      seriesCacheError
    ) {
      logger.error("Error fetching user content:", {
        userListError,
        watchedMoviesError,
        watchedEpisodesError,
        seriesCacheError,
      });
      return {
        watchlist: [],
        watchedIds: [],
        watchedEpisodes: {},
        seriesMetadata: {},
      };
    }

    const watchlist: UserListItem[] = [];

    if (userListData) {
      const updates = [];

      for (const i of userListData) {
        const hasMetadata = i.title || i.name;

        if (hasMetadata) {
          watchlist.push({
            id: i.id,
            user_id: i.user_id,
            tmdb_id: i.tmdb_id,
            media_type: i.media_type as "movie" | "tv",
            title: i.title,
            name: i.name,
            poster_path: i.poster_path,
            backdrop_path: i.backdrop_path,
            vote_average: i.vote_average,
            release_date: i.release_date,
            first_air_date: i.first_air_date,
            overview: i.overview,
            created_at: i.created_at,
            tags: i.user_list_tags || [],
          });
        } else {
          try {
            const details = await tmdb.getDetails(
              i.tmdb_id,
              i.media_type as "movie" | "tv",
            );

            watchlist.push({
              id: i.id,
              user_id: i.user_id,
              tmdb_id: details.id,
              media_type: details.media_type,
              title: details.title,
              name: details.name,
              poster_path: details.poster_path,
              backdrop_path: details.backdrop_path,
              vote_average: details.vote_average,
              release_date: details.release_date,
              first_air_date: details.first_air_date,
              overview: details.overview,
              created_at: i.created_at,
              tags: i.user_list_tags || [],
            });

            updates.push(
              supabase
                .from("user_list")
                .update({
                  title: details.title,
                  name: details.name,
                  poster_path: details.poster_path,
                  backdrop_path: details.backdrop_path,
                  vote_average: details.vote_average,
                  release_date: details.release_date,
                  first_air_date: details.first_air_date,
                  overview: details.overview,
                })
                .eq("id", i.id),
            );
          } catch (err) {
            logger.error(`Failed to self-heal item ${i.tmdb_id}:`, err);
            watchlist.push({
              id: i.id,
              user_id: i.user_id,
              tmdb_id: i.tmdb_id,
              media_type: i.media_type as "movie" | "tv",
              title: "Error loading",
              name: "Error loading",
              created_at: i.created_at,
              tags: i.user_list_tags || [],
            });
          }
        }
      }

      if (updates.length > 0) {
        Promise.all(updates).then(() =>
          logger.info(`Self-healed ${updates.length} user list items`),
        );
      }
    }

    const watchedIds = (watchedMoviesData || []).map((i) => i.tmdb_id);

    const watchedEpisodes: Record<
      number,
      Record<number, WatchedEpisodeMetadata>
    > = {};

    (watchedEpisodesData || []).forEach((i) => {
      if (!watchedEpisodes[i.tmdb_show_id]) {
        watchedEpisodes[i.tmdb_show_id] = {};
      }
      watchedEpisodes[i.tmdb_show_id][i.tmdb_episode_id] = {
        season_number: i.season_number,
        episode_number: i.episode_number,
      };
    });

    const seriesMetadata: Record<number, SeriesMetadata> = {};
    (seriesCacheData || []).forEach((i) => {
      seriesMetadata[i.tmdb_id] = {
        total_episodes: i.total_episodes,
        number_of_seasons: i.number_of_seasons,
      };
    });

    return { watchlist, watchedIds, watchedEpisodes, seriesMetadata };
  },

  async addToList(
    item: ContentItem,
    tags?: TagInput[],
  ): Promise<UserListItem | null> {
    const { data, error } = await supabase
      .from("user_list")
      .insert({
        tmdb_id: item.id,
        media_type: item.media_type,
        title: item.title,
        name: item.name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        overview: item.overview,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error adding to list:", error);
      return null;
    }

    if (tags && tags.length > 0) {
      const tagRows = tags.map((t) => ({
        user_list_id: data.id,
        tag: t.tag,
        partner_user_id: t.partner_user_id,
      }));

      const { error: tagError } = await supabase
        .from("user_list_tags")
        .insert(tagRows);

      if (tagError) logger.error("Error adding tags:", tagError);
    }

    return data as UserListItem;
  },

  async removeFromList(contentId: number) {
    const { error } = await supabase
      .from("user_list")
      .delete()
      .match({ tmdb_id: contentId });

    if (error) logger.error("Error removing from list:", error);
  },

  async addTagToListItem(itemId: string, tag: UserListTagType) {
    const { error } = await supabase
      .from("user_list_tags")
      .insert({ user_list_id: itemId, tag });

    if (error) logger.error("Error adding tag to item:", error);
  },

  async removeTagFromListItem(itemId: string, tag: UserListTagType) {
    const { error } = await supabase
      .from("user_list_tags")
      .delete()
      .match({ user_list_id: itemId, tag });

    if (error) logger.error("Error removing tag from item:", error);
  },

  async markAsWatched(
    contentId: number,
    contentType: ContentType = "movie",
    metadata: Record<string, unknown> = {},
  ) {
    if (contentType === "movie") {
      const { error } = await supabase.from("watched_movies").insert({
        tmdb_id: contentId,
      });
      if (error) logger.error("Error marking movie as watched:", error);
    } else if (contentType === "episode") {
      const { error } = await supabase.from("watched_episodes").insert({
        tmdb_episode_id: contentId,
        tmdb_show_id: metadata.show_id,
        season_number: metadata.season_number,
        episode_number: metadata.episode_number,
      });
      if (error) logger.error("Error marking episode as watched:", error);
    }
  },

  async markAsUnwatched(contentId: number) {
    const { error: movieError } = await supabase
      .from("watched_movies")
      .delete()
      .eq("tmdb_id", contentId);

    const { error: episodeError } = await supabase
      .from("watched_episodes")
      .delete()
      .eq("tmdb_episode_id", contentId);

    if (movieError)
      logger.error("Error marking movie as unwatched:", movieError);
    if (episodeError)
      logger.error("Error marking episode as unwatched:", episodeError);
  },

  async saveSeriesMetadata(showId: number, metadata: SeriesMetadata) {
    const { error } = await supabase.from("series_cache").upsert({
      tmdb_id: showId,
      total_episodes: metadata.total_episodes,
      number_of_seasons: metadata.number_of_seasons,
      updated_at: new Date().toISOString(),
    });

    if (error) logger.error("Error saving series metadata:", error);
  },

  async markSeasonAsWatched(
    seriesId: number,
    seasonNumber: number,
    episodes: Episode[],
  ) {
    const payload = episodes.map((ep) => ({
      tmdb_id: ep.id,
      tmdb_show_id: seriesId,
      season_number: seasonNumber,
      episode_number: ep.episode_number,
    }));

    const { error } = await supabase.rpc("mark_season_watched", {
      episodes: payload,
    });

    if (error) logger.error("Error marking season as watched:", error);
  },

  async markSeasonAsUnwatched(seriesId: number, seasonNumber: number) {
    const { error } = await supabase.rpc("mark_season_unwatched", {
      show_id: seriesId,
      season_num: seasonNumber,
    });

    if (error) logger.error("Error marking season as unwatched:", error);
  },

  async hasData(userId: string): Promise<boolean> {
    const [
      { count: listCount },
      { count: watchedMoviesCount },
      { count: watchedEpisodesCount },
    ] = await Promise.all([
      supabase
        .from("user_list")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("watched_movies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("watched_episodes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    return (
      (listCount || 0) > 0 ||
      (watchedMoviesCount || 0) > 0 ||
      (watchedEpisodesCount || 0) > 0
    );
  },
};
