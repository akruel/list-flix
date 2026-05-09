import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { MigrationConflictModal } from "./MigrationConflictModal";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        dialog-open-change
      </button>
      {children}
    </div>
  ),
  DialogContent: ({
    children,
    onPointerDownOutside,
    onEscapeKeyDown,
  }: {
    children: ReactNode;
    onPointerDownOutside?: (event: { preventDefault: () => void }) => void;
    onEscapeKeyDown?: (event: { preventDefault: () => void }) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onPointerDownOutside?.({ preventDefault: vi.fn() })}
      >
        outside
      </button>
      <button
        type="button"
        onClick={() => onEscapeKeyDown?.({ preventDefault: vi.fn() })}
      >
        escape
      </button>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));

describe("MigrationConflictModal", () => {
  it("renders conflict options and triggers callbacks", async () => {
    const onKeepLocal = vi.fn();
    const onUseAccount = vi.fn();

    render(
      <MigrationConflictModal
        isOpen
        onKeepLocal={onKeepLocal}
        onUseAccount={onUseAccount}
      />,
    );

    expect(screen.getByText("Conflito de Dados")).toBeInTheDocument();
    expect(screen.getByText("Manter dados locais")).toBeInTheDocument();
    expect(screen.getByText("Usar dados da conta")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Manter dados locais/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Usar dados da conta/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "outside" }));
    await userEvent.click(screen.getByRole("button", { name: "escape" }));
    await userEvent.click(
      screen.getByRole("button", { name: "dialog-open-change" }),
    );

    expect(onKeepLocal).toHaveBeenCalledOnce();
    expect(onUseAccount).toHaveBeenCalledOnce();
  });

  it("triggers onKeepLocal with Enter key", () => {
    const onKeepLocal = vi.fn();
    const onUseAccount = vi.fn();

    render(
      <MigrationConflictModal
        isOpen
        onKeepLocal={onKeepLocal}
        onUseAccount={onUseAccount}
      />,
    );

    const option = screen.getByRole("button", { name: /Manter dados locais/i });
    fireEvent.keyDown(option, { key: "Enter" });

    expect(onKeepLocal).toHaveBeenCalledOnce();
    expect(onUseAccount).not.toHaveBeenCalled();
  });

  it("triggers onUseAccount with Space key", () => {
    const onKeepLocal = vi.fn();
    const onUseAccount = vi.fn();

    render(
      <MigrationConflictModal
        isOpen
        onKeepLocal={onKeepLocal}
        onUseAccount={onUseAccount}
      />,
    );

    const option = screen.getByRole("button", { name: /Usar dados da conta/i });
    fireEvent.keyDown(option, { key: " " });

    expect(onUseAccount).toHaveBeenCalledOnce();
    expect(onKeepLocal).not.toHaveBeenCalled();
  });

  it("does not trigger callback with other keys", () => {
    const onKeepLocal = vi.fn();
    const onUseAccount = vi.fn();

    render(
      <MigrationConflictModal
        isOpen
        onKeepLocal={onKeepLocal}
        onUseAccount={onUseAccount}
      />,
    );

    const option = screen.getByRole("button", { name: /Manter dados locais/i });
    fireEvent.keyDown(option, { key: "Tab" });

    expect(onKeepLocal).not.toHaveBeenCalled();
    expect(onUseAccount).not.toHaveBeenCalled();
  });
});
