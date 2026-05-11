import { describe, expect, it, vi } from "vitest";

import { withRetry } from "./retry";

describe("AI Providers: retry", () => {
  it("returns result on first attempt if successful", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { attempts: 3, delay: 0 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, { attempts: 3, delay: 0 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws last error after all attempts fail", async () => {
    const error = new Error("permanent fail");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { attempts: 2, delay: 0 })).rejects.toThrow(
      "permanent fail",
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
