import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import ErrorFallback from "./ErrorFallback"

describe("ErrorFallback", () => {
  it("renders error message correctly", () => {
    const error = new Error("Test error message")
    const resetErrorBoundary = vi.fn()

    render(
      <ErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        // @ts-expect-error - other props not needed for test
        isError={true}
      />,
    )

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument()
    expect(screen.getByText("Test error message")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument()
  })

  it("calls resetErrorBoundary when retry button is clicked", async () => {
    const error = new Error("Test error")
    const resetErrorBoundary = vi.fn()
    const user = userEvent.setup()

    render(
      <ErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        // @ts-expect-error - other props not needed for test
        isError={true}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(resetErrorBoundary).toHaveBeenCalledTimes(1)
  })

  it("shows default message when error has no message", () => {
    const error = new Error("")
    const resetErrorBoundary = vi.fn()

    render(
      <ErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        // @ts-expect-error - other props not needed for test
        isError={true}
      />,
    )

    expect(screen.getByText("Ocorreu um erro inesperado. Tente novamente.")).toBeInTheDocument()
  })
})
