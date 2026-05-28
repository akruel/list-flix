import { describe, expect, it, vi } from "vitest";

import { userContentKeys, userContentQuery } from "./userContent.queries";

vi.mock("./userContent", () => ({
  userContentService: {
    getUserContent: vi.fn().mockResolvedValue({
      watchlist: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    }),
  },
}));

describe("userContent.queries", () => {
  it("exposes the userContent key", () => {
    expect(userContentKeys.all).toEqual(["userContent"]);
  });

  it("delegates to userContentService.getUserContent", async () => {
    const { userContentService } = await import("./userContent");

    const query = userContentQuery();
    expect(query.queryKey).toEqual(["userContent"]);

    await query.queryFn();
    expect(userContentService.getUserContent).toHaveBeenCalledOnce();
  });
});
