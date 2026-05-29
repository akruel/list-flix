import { describe, expect, it, vi } from "vitest";

import { userProfileQuery } from "./auth.queries";

vi.mock("./auth", () => ({
  authService: {
    getUserProfile: vi.fn().mockResolvedValue({ id: "user-1" }),
  },
}));

describe("auth.queries", () => {
  it("builds user profile query options", async () => {
    const { authService } = await import("./auth");
    const query = userProfileQuery();

    expect(query.queryKey).toEqual(["auth", "userProfile"]);
    expect(query.retry).toBe(false);
    await expect(query.queryFn()).resolves.toEqual({ id: "user-1" });
    expect(authService.getUserProfile).toHaveBeenCalledOnce();
  });
});
