import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TagSelector } from "./TagSelector";

describe("TagSelector", () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both tag options", () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    expect(screen.getByText("Noite de Pipoca")).toBeInTheDocument();
    expect(screen.getByText("Fim de Semana")).toBeInTheDocument();
    expect(screen.getByText("Filmes leves e divertidos")).toBeInTheDocument();
    expect(screen.getByText("Maratona ou binge-watch")).toBeInTheDocument();
  });

  it("shows selected state for active tags", () => {
    render(
      <TagSelector selectedTags={["noite_de_pipoca"]} onToggle={onToggle} />,
    );

    const button = screen.getByTestId("tag-selector-noite_de_pipoca");
    expect(button).toHaveClass("border-purple-500");
  });

  it("shows inactive state for unselected tags", () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    const button = screen.getByTestId("tag-selector-noite_de_pipoca");
    expect(button).toHaveClass("border-gray-700");
  });

  it("calls onToggle when a tag is clicked", async () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    await userEvent.click(screen.getByTestId("tag-selector-noite_de_pipoca"));
    expect(onToggle).toHaveBeenCalledWith("noite_de_pipoca");
  });

  it("calls onToggle for fim_de_semana tag", async () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    await userEvent.click(screen.getByTestId("tag-selector-fim_de_semana"));
    expect(onToggle).toHaveBeenCalledWith("fim_de_semana");
  });

  it("renders assistir_com option", () => {
    render(<TagSelector selectedTags={[]} onToggle={onToggle} />);

    expect(screen.getByText("Assistir com")).toBeInTheDocument();
    expect(
      screen.getByText("Compartilhar com um parceiro"),
    ).toBeInTheDocument();
  });

  it("shows partner select when assistir_com is selected and partnerOptions exist", () => {
    render(
      <TagSelector
        selectedTags={["assistir_com"]}
        onToggle={onToggle}
        partnerOptions={[{ partnerUserId: "pu1", displayName: "Partner One" }]}
        selectedPartnerId="pu1"
      />,
    );

    expect(screen.getByText("Partner One")).toBeInTheDocument();
    expect(screen.getByTestId("tag-selector-partner")).toBeInTheDocument();
  });

  it("does not show partner select when no partnerOptions", () => {
    render(
      <TagSelector
        selectedTags={["assistir_com"]}
        onToggle={onToggle}
        partnerOptions={[]}
      />,
    );

    expect(
      screen.queryByTestId("tag-selector-partner"),
    ).not.toBeInTheDocument();
  });

  it("does not show partner select when assistir_com not selected", () => {
    render(
      <TagSelector
        selectedTags={["noite_de_pipoca"]}
        onToggle={onToggle}
        partnerOptions={[{ partnerUserId: "pu1", displayName: "Partner One" }]}
      />,
    );

    expect(
      screen.queryByTestId("tag-selector-partner"),
    ).not.toBeInTheDocument();
  });

  it("calls onPartnerChange when partner is selected", async () => {
    const onPartnerChange = vi.fn();
    render(
      <TagSelector
        selectedTags={["assistir_com"]}
        onToggle={onToggle}
        partnerOptions={[{ partnerUserId: "pu1", displayName: "Partner One" }]}
        onPartnerChange={onPartnerChange}
      />,
    );

    await userEvent.selectOptions(
      screen.getByTestId("tag-selector-partner"),
      "pu1",
    );

    expect(onPartnerChange).toHaveBeenCalledWith("pu1");
  });

  it("clears partner selection when assistir_com is deselected", async () => {
    const onPartnerChange = vi.fn();
    render(
      <TagSelector
        selectedTags={["assistir_com"]}
        onToggle={onToggle}
        partnerOptions={[{ partnerUserId: "pu1", displayName: "Partner One" }]}
        onPartnerChange={onPartnerChange}
      />,
    );

    await userEvent.click(screen.getByTestId("tag-selector-assistir_com"));

    expect(onPartnerChange).toHaveBeenCalledWith(undefined);
  });

  it("resets to undefined when selecting empty partner option", async () => {
    const onPartnerChange = vi.fn();
    render(
      <TagSelector
        selectedTags={["assistir_com"]}
        onToggle={onToggle}
        partnerOptions={[{ partnerUserId: "pu1", displayName: "Partner One" }]}
        onPartnerChange={onPartnerChange}
      />,
    );

    await userEvent.selectOptions(
      screen.getByTestId("tag-selector-partner"),
      "",
    );

    expect(onPartnerChange).toHaveBeenCalledWith(undefined);
  });
});
