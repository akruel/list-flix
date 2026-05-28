// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProvidersBar } from "./ProvidersBar";

vi.mock("@/services/tmdb", () => ({
  tmdb: {
    getImageUrl: () => "https://img.local/logo.jpg",
  },
}));

describe("ProvidersBar", () => {
  it("shows empty message when no providers", () => {
    render(<ProvidersBar flatrate={[]} rent={[]} buy={[]} />);

    expect(
      screen.getByText(
        "Nenhuma informação de streaming disponível para o Brasil.",
      ),
    ).toBeInTheDocument();
  });

  it("renders rent and buy provider sections", () => {
    render(
      <ProvidersBar
        flatrate={[]}
        rent={[
          {
            provider_id: 2,
            provider_name: "Apple TV",
            logo_path: "/apple.png",
          },
        ]}
        buy={[
          {
            provider_id: 3,
            provider_name: "Google Play",
            logo_path: "/google.png",
          },
        ]}
      />,
    );

    expect(screen.getByText("Alugar")).toBeInTheDocument();
    expect(screen.getByTitle("Apple TV")).toBeInTheDocument();
    expect(screen.getByText("Comprar")).toBeInTheDocument();
    expect(screen.getByTitle("Google Play")).toBeInTheDocument();
  });

  it("renders streaming providers and TMDB link", () => {
    render(
      <ProvidersBar
        flatrate={[
          {
            provider_id: 1,
            provider_name: "Netflix",
            logo_path: "/netflix.png",
          },
        ]}
        rent={[]}
        buy={[]}
        link="https://www.themoviedb.org/watch"
      />,
    );

    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByTitle("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Ver todos no TMDB")).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/watch",
    );
  });
});
