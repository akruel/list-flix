import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { logger } from "./logger"

describe("logger", () => {
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(vi.fn())
    vi.spyOn(console, "warn").mockImplementation(vi.fn())
    vi.spyOn(console, "log").mockImplementation(vi.fn())
  })

  afterEach(() => {
    console.error = originalError
    console.warn = originalWarn
    console.log = originalLog
  })

  it("logs error messages with error level", () => {
    logger.error("test error")
    expect(console.error).toHaveBeenCalledWith("[ListFlix ERROR]", "test error")
  })

  it("logs warn messages with warn level", () => {
    logger.warn("test warning")
    expect(console.warn).toHaveBeenCalledWith("[ListFlix WARN]", "test warning")
  })

  it("logs info messages with info level", () => {
    logger.info("test info")
    expect(console.log).toHaveBeenCalledWith("[ListFlix INFO]", "test info")
  })

  it("handles multiple arguments", () => {
    logger.error("arg1", "arg2", { key: "value" })
    expect(console.error).toHaveBeenCalledWith("[ListFlix ERROR]", "arg1", "arg2", { key: "value" })
  })
})
