import { beforeEach, describe, expect, it, vi } from "vitest";

import { supabase } from "@/lib/supabase";

import { partnerService } from "./partnerService";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const mockedSupabase = supabase as unknown as {
  auth: { getUser: MockFn };
  from: MockFn;
  rpc: MockFn;
};

describe("partnerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableUsers", () => {
    it("returns available users on success", async () => {
      const users = [
        { user_id: "u1", display_name: "User One" },
        { user_id: "u2", display_name: "User Two" },
      ];
      mockedSupabase.rpc.mockResolvedValue({ data: users, error: null });

      const result = await partnerService.getAvailableUsers();

      expect(result).toEqual(users);
      expect(mockedSupabase.rpc).toHaveBeenCalledWith(
        "list_non_anonymous_users",
      );
    });

    it("returns empty array on error", async () => {
      mockedSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error("rpc error"),
      });

      const result = await partnerService.getAvailableUsers();

      expect(result).toEqual([]);
    });
  });

  describe("addPartner", () => {
    it("inserts partner and returns the record", async () => {
      const partner = {
        id: "p1",
        user_id: "u1",
        partner_user_id: "u2",
        created_at: "2026-01-01T00:00:00Z",
      };
      mockedSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: partner, error: null }),
          }),
        }),
      });

      const result = await partnerService.addPartner("u2");

      expect(result).toEqual(partner);
      expect(mockedSupabase.from).toHaveBeenCalledWith("watch_partners");
    });

    it("returns null on error", async () => {
      mockedSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("insert error"),
            }),
          }),
        }),
      });

      const result = await partnerService.addPartner("u2");

      expect(result).toBeNull();
    });
  });

  describe("removePartner", () => {
    it("deletes partner by id", async () => {
      mockedSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await partnerService.removePartner("p1");

      expect(mockedSupabase.from).toHaveBeenCalledWith("watch_partners");
    });

    it("does not throw on error", async () => {
      mockedSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error("delete error") }),
        }),
      });

      await expect(partnerService.removePartner("p1")).resolves.toBeUndefined();
    });
  });

  describe("getPartners", () => {
    it("returns partners for authenticated user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "u1" } },
      });
      const partners = [
        {
          id: "p1",
          user_id: "u1",
          partner_user_id: "u2",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      mockedSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({ data: partners, error: null }),
        }),
      });

      const result = await partnerService.getPartners();

      expect(result).toEqual(partners);
    });

    it("returns empty array when no user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await partnerService.getPartners();

      expect(result).toEqual([]);
    });

    it("returns empty array on query error", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "u1" } },
      });
      mockedSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("query error"),
          }),
        }),
      });

      const result = await partnerService.getPartners();

      expect(result).toEqual([]);
    });
  });

  describe("getAcceptedPartners", () => {
    it("returns partners for authenticated user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "u1" } },
      });
      const partners = [
        {
          id: "p1",
          user_id: "u1",
          partner_user_id: "u2",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      mockedSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({ data: partners, error: null }),
        }),
      });

      const result = await partnerService.getAcceptedPartners();

      expect(result).toEqual(partners);
    });

    it("returns empty array when no user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await partnerService.getAcceptedPartners();

      expect(result).toEqual([]);
    });

    it("returns empty array on query error", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "u1" } },
      });
      mockedSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("query error"),
          }),
        }),
      });

      const result = await partnerService.getAcceptedPartners();

      expect(result).toEqual([]);
    });
  });
});
