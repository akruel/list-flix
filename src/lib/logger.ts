type LogLevel = "error" | "warn" | "info"

const isProduction = import.meta.env.PROD

function log(level: LogLevel, ...args: unknown[]) {
  /* v8 ignore next 3 */
  if (isProduction && level === "info") return
  const prefix = `[ListFlix ${level.toUpperCase()}]`
  if (level === "error") {
    console.error(prefix, ...args)
  } else if (level === "warn") {
    console.warn(prefix, ...args)
  } else {
    console.log(prefix, ...args)
  }
}

export const logger = {
  error: (...args: unknown[]) => log("error", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  info: (...args: unknown[]) => log("info", ...args),
}
