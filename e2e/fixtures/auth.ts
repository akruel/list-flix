import { expect, type Page } from "@playwright/test";

import { ROUTE_TEST_IDS } from "./routes";
import { createSeededUser } from "./supabase-seed";

export async function signIn(page: Page): Promise<void> {
  const user = await createSeededUser("e2e");

  await page.goto("/auth");

  await page.evaluate(
    async ({ email, password }) => {
      const sb = window.__supabase;
      if (!sb) throw new Error("__supabase not available on window");
      const { error } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    { email: user.email, password: user.password },
  );

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Em Alta" })).toBeVisible();
}
