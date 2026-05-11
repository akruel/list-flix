import { logger } from "@/lib/logger";

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts: number; delay: number },
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < options.attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < options.attempts - 1) {
        logger.warn(`Retrying after attempt ${i + 1}:`, error);
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }
    }
  }
  throw lastError;
}
