import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { queryClient } from "./queryClient";

describe("queryClient", () => {
  it("exports a QueryClient instance", () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it("uses sensible default options for queries", () => {
    const { queries, mutations } = queryClient.getDefaultOptions();
    expect(queries?.staleTime).toBe(60_000);
    expect(queries?.gcTime).toBe(300_000);
    expect(queries?.retry).toBe(1);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(mutations?.retry).toBe(1);
  });
});
