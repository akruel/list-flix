import { describe, expect, it } from "vitest";

import { getPostLoginDestination } from "./postLoginNavigation";

describe("getPostLoginDestination", () => {
  it("returns root destination", () => {
    expect(getPostLoginDestination()).toEqual({ to: "/" });
  });
});
