import { withSupabase } from "npm:@supabase/server";
import webpush from "npm:web-push@3.6.7";

const TMDB_ACCESS_TOKEN = Deno.env.get("TMDB_ACCESS_TOKEN");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@listflix.app";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("Missing VAPID environment variables");
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getShowDetails(showId: number): Promise<{
  name: string;
  nextEpisode: {
    name: string;
    seasonNumber: number;
    episodeNumber: number;
    airDate: string;
  } | null;
} | null> {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${showId}`, {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
    });

    if (!response.ok) {
      console.error(`TMDB API error for show ${showId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.next_episode_to_air) {
      return { name: data.name, nextEpisode: null };
    }

    return {
      name: data.name,
      nextEpisode: {
        name: data.next_episode_to_air.name || "",
        seasonNumber: data.next_episode_to_air.season_number,
        episodeNumber: data.next_episode_to_air.episode_number,
        airDate: data.next_episode_to_air.air_date,
      },
    };
  } catch (error) {
    console.error(`Failed to fetch show ${showId}:`, error);
    return null;
  }
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    const supabase = ctx.supabaseAdmin;

    try {
      if (!TMDB_ACCESS_TOKEN) {
        console.error("Missing required env vars: TMDB_ACCESS_TOKEN");
        return new Response(
          JSON.stringify({ error: "Missing configuration" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const today = getTodayDateString();
      console.log(`Checking for episodes airing on ${today}`);

      const { data: shows, error: showsError } = await supabase
        .from("watchlists")
        .select("tmdb_id")
        .eq("media_type", "tv");

      if (showsError) {
        throw new Error(`Failed to query watchlists: ${showsError.message}`);
      }

      if (!shows || shows.length === 0) {
        console.log("No TV shows found in watchlists");
        return new Response(JSON.stringify({ notified: 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const uniqueShowIds = [...new Set(shows.map((s) => s.tmdb_id))];
      console.log(`Checking ${uniqueShowIds.length} unique TV shows`);

      const BATCH_SIZE = 10;
      const BATCH_DELAY_MS = 2000;
      const airingToday: {
        showId: number;
        showName: string;
        episodeName: string;
        seasonNumber: number;
        episodeNumber: number;
      }[] = [];

      for (let i = 0; i < uniqueShowIds.length; i += BATCH_SIZE) {
        const batch = uniqueShowIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(getShowDetails));

        for (let j = 0; j < batch.length; j++) {
          const details = batchResults[j];
          if (details?.nextEpisode && details.nextEpisode.airDate === today) {
            airingToday.push({
              showId: batch[j],
              showName: details.name,
              episodeName: details.nextEpisode.name,
              seasonNumber: details.nextEpisode.seasonNumber,
              episodeNumber: details.nextEpisode.episodeNumber,
            });
          }
        }

        if (i + BATCH_SIZE < uniqueShowIds.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      if (airingToday.length === 0) {
        console.log("No episodes airing today");
        return new Response(JSON.stringify({ notified: 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`Found ${airingToday.length} episodes airing today`);

      const showIds = airingToday.map((s) => s.showId);
      const { data: watchlistUsers, error: usersError } = await supabase
        .from("watchlists")
        .select("user_id, tmdb_id")
        .in("tmdb_id", showIds)
        .eq("media_type", "tv");

      if (usersError) {
        throw new Error(
          `Failed to query watchlist users: ${usersError.message}`,
        );
      }

      const showUserMap = new Map<number, Set<string>>();
      for (const entry of watchlistUsers || []) {
        const users = showUserMap.get(entry.tmdb_id) || new Set();
        users.add(entry.user_id);
        showUserMap.set(entry.tmdb_id, users);
      }

      const allUserIds = [
        ...new Set(watchlistUsers?.map((w) => w.user_id) || []),
      ];

      if (allUserIds.length === 0) {
        console.log("No users to notify");
        return new Response(JSON.stringify({ notified: 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .in("user_id", allUserIds);

      if (subError) {
        throw new Error(`Failed to query subscriptions: ${subError.message}`);
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log("No push subscriptions found");
        return new Response(JSON.stringify({ notified: 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const userSubMap = new Map<
        string,
        { endpoint: string; p256dh: string; auth: string }
      >();
      for (const sub of subscriptions) {
        userSubMap.set(sub.user_id, {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        });
      }

      let notified = 0;
      let expiredSubscriptions = 0;

      for (const episode of airingToday) {
        const userIds = showUserMap.get(episode.showId);
        if (!userIds) continue;

        for (const userId of userIds) {
          const sub = userSubMap.get(userId);
          if (!sub) continue;

          const payload = JSON.stringify({
            title: episode.showName,
            body: `Novo episódio: ${episode.episodeName || "Episódio " + episode.episodeNumber} (T${episode.seasonNumber} E${episode.episodeNumber})`,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            data: { url: `/details/tv/${episode.showId}` },
          });

          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
            );
            notified++;
          } catch (error) {
            const statusCode = (error as Record<string, unknown>).statusCode;
            if (statusCode === 410) {
              console.warn(`Removing expired subscription for user ${userId}`);
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("user_id", userId);
              expiredSubscriptions++;
            } else {
              console.error(
                `Failed to send notification to user ${userId}:`,
                (error as Error).message,
              );
            }
          }
        }
      }

      console.log(
        `Sent ${notified} notifications, removed ${expiredSubscriptions} expired subscriptions`,
      );

      return new Response(
        JSON.stringify({
          notified,
          totalEpisodes: airingToday.length,
          expiredSubscriptions,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("check-episodes error:", (error as Error).message);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
};
