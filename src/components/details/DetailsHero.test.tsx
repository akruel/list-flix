// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ContentDetails } from "@/types";

import { DetailsHero } from "./DetailsHero";

vi.mock("@/services/tmdb", () => ({
  tmdb: {
    getImageUrl: (_path: string, size: string) => `https://img.local/${size}`,
  },
}));

const baseDetails = {
  status: "Released",
  credits: { cast: [] },
  videos: { results: [] },
  genres: [],
} satisfies Pick<ContentDetails, "status" | "credits" | "videos" | "genres">;

const movieDetails: ContentDetails = {
  ...baseDetails,
  genres: [{ id: 1, name: "Action" }],
  id: 1,
  media_type: "movie",
  title: "Test Movie",
  release_date: "2020-05-15",
  vote_average: 8.2,
  runtime: 125,
  backdrop_path: "/backdrop.jpg",
  poster_path: "/poster.jpg",
};

describe("DetailsHero", () => {
  it("renders TV show name and first air date", () => {
    render(
      <DetailsHero
        details={{
          ...baseDetails,
          id: 2,
          media_type: "tv",
          name: "Test Show",
          first_air_date: "2019-03-01",
          vote_average: 7.5,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Test Show" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2019")).toBeInTheDocument();
  });

  it("renders movie title, year, rating and genres", () => {
    render(<DetailsHero details={movieDetails} />);

    expect(
      screen.getByRole("heading", { name: "Test Movie" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("8.2")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("2h 5m")).toBeInTheDocument();
  });

  it("falls back to empty title when name fields are missing", () => {
    render(
      <DetailsHero
        details={{
          ...baseDetails,
          id: 3,
          media_type: "tv",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "" })).toBeInTheDocument();
  });

  it("renders N/A year and hides runtime when metadata is missing", () => {
    render(
      <DetailsHero
        details={{
          ...movieDetails,
          release_date: undefined,
          runtime: undefined,
          vote_average: undefined,
        }}
      />,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.queryByText(/h\s/)).not.toBeInTheDocument();
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });
});
