import clsx from "clsx";

import { getRelativeTime } from "@/lib/date-utils";
import type { Activity, GroupedActivity } from "@/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

interface AvatarProps {
  name?: string;
  avatarUrl?: string;
}

function Avatar({ name, avatarUrl }: AvatarProps) {
  const dim = "h-8 w-8 text-xs";
  const initials = name?.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join("")
    : "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "avatar"}
        className={clsx(
          dim,
          "flex-shrink-0 rounded-full object-cover ring-1 ring-border",
        )}
      />
    );
  }

  return (
    <span
      className={clsx(
        dim,
        "flex flex-shrink-0 items-center justify-center rounded-full bg-purple-700 font-semibold text-white ring-1 ring-border",
      )}
    >
      {initials}
    </span>
  );
}

interface StackedAvatarsProps {
  actors: { actor_id: string; name?: string; avatar_url?: string }[];
}

function StackedAvatars({ actors }: StackedAvatarsProps) {
  const visible = actors.slice(0, 3);
  return (
    <div
      className="relative flex flex-shrink-0 items-center"
      style={{ width: 32 + (visible.length - 1) * 16 }}
    >
      {visible.map((actor, idx) => (
        <div
          key={actor.actor_id}
          className="absolute"
          style={{ left: idx * 16, zIndex: visible.length - idx }}
        >
          <Avatar name={actor.name} avatarUrl={actor.avatar_url} />
        </div>
      ))}
    </div>
  );
}

function PosterThumbnail({
  posterPath,
  title,
}: {
  posterPath?: string;
  title?: string;
}) {
  if (!posterPath) return null;
  return (
    <img
      src={`${TMDB_IMAGE_BASE}${posterPath}`}
      alt={title ?? "poster"}
      className="h-[60px] w-10 flex-shrink-0 rounded object-cover"
    />
  );
}

function buildEpisodeBatchText(
  actors: { name?: string }[],
  episodeCount: number,
  contentTitle?: string,
  episode?: { season_number?: number; episode_number?: number },
): React.ReactNode {
  const title = contentTitle ?? "conteúdo";
  const actorNames = actors.map((a) => a.name ?? "Alguém");

  let actorPart: React.ReactNode;
  if (actorNames.length === 1) {
    actorPart = <strong>{actorNames[0]}</strong>;
  } else if (actorNames.length === 2) {
    actorPart = (
      <>
        <strong>{actorNames[0]}</strong> e <strong>{actorNames[1]}</strong>
      </>
    );
  } else {
    actorPart = (
      <>
        <strong>{actorNames[0]}</strong> e mais {actorNames.length - 1}
      </>
    );
  }

  const verb = actors.length > 1 ? "assistiram" : "assistiu";

  if (episodeCount === 1 && episode?.season_number && episode?.episode_number) {
    const sXX = String(episode.season_number).padStart(2, "0");
    const eXX = String(episode.episode_number).padStart(2, "0");
    return (
      <>
        {actorPart} {verb} S{sXX}E{eXX} de <strong>{title}</strong>
      </>
    );
  }

  return (
    <>
      {actorPart} {verb} {episodeCount} episódio{episodeCount > 1 ? "s" : ""} de{" "}
      <strong>{title}</strong>
    </>
  );
}

function buildSingleText(activity: Activity): React.ReactNode {
  const { metadata, activity_type } = activity;
  const actor = <strong>{metadata.actor_name ?? "Alguém"}</strong>;
  const title = metadata.content_title ?? "conteúdo";
  const list = metadata.list_name ?? "lista";

  switch (activity_type) {
    case "episode_watched": {
      const s = metadata.season_number;
      const e = metadata.episode_number;
      if (s && e) {
        const sXX = String(s).padStart(2, "0");
        const eXX = String(e).padStart(2, "0");
        return (
          <>
            {actor} assistiu S{sXX}E{eXX} de <strong>{title}</strong>
          </>
        );
      }
      return (
        <>
          {actor} assistiu um episódio de <strong>{title}</strong>
        </>
      );
    }
    case "movie_watched":
      return (
        <>
          {actor} assistiu <strong>{title}</strong>
        </>
      );
    case "item_added":
      return (
        <>
          {actor} adicionou <strong>{title}</strong> à lista &ldquo;{list}
          &rdquo;
        </>
      );
    case "item_removed":
      return (
        <>
          {actor} removeu <strong>{title}</strong> da lista &ldquo;{list}&rdquo;
        </>
      );
    case "member_joined":
      return (
        <>
          {actor} entrou na lista &ldquo;{list}&rdquo;
        </>
      );
    default:
      return <>{actor} realizou uma atividade</>;
  }
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
      {children}
    </div>
  );
}

function SingleActivityCard({ activity }: { activity: Activity }) {
  const { metadata } = activity;

  return (
    <CardShell>
      <Avatar
        name={metadata.actor_name}
        avatarUrl={metadata.actor_avatar_url}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground">
          {buildSingleText(activity)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getRelativeTime(activity.created_at)}
        </p>
      </div>
      <PosterThumbnail
        posterPath={metadata.poster_path}
        title={metadata.content_title}
      />
    </CardShell>
  );
}

function EpisodeBatchCard({
  item,
}: {
  item: Extract<GroupedActivity, { type: "episode_batch" }>;
}) {
  const firstEpisode = item.episodes[0];
  const episodeMetadata = firstEpisode
    ? {
        season_number: firstEpisode.metadata.season_number,
        episode_number: firstEpisode.metadata.episode_number,
      }
    : undefined;

  return (
    <CardShell>
      <StackedAvatars actors={item.actors} />
      <div
        className="min-w-0 flex-1"
        style={{ paddingLeft: (Math.min(item.actors.length, 3) - 1) * 16 }}
      >
        <p className="text-sm leading-snug text-foreground">
          {buildEpisodeBatchText(
            item.actors,
            item.episodes.length,
            item.metadata.content_title,
            episodeMetadata,
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getRelativeTime(item.latest_at)}
        </p>
      </div>
      <PosterThumbnail
        posterPath={item.metadata.poster_path}
        title={item.metadata.content_title}
      />
    </CardShell>
  );
}

interface ActivityCardProps {
  item: GroupedActivity;
}

export function ActivityCard({ item }: ActivityCardProps) {
  if (item.type === "episode_batch") {
    return <EpisodeBatchCard item={item} />;
  }
  return <SingleActivityCard activity={item.activity} />;
}
