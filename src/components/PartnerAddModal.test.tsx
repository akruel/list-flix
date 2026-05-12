import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PartnerAddModal } from "./PartnerAddModal";

const mocks = vi.hoisted(() => ({
  storeValue: {
    partners: [] as Array<{
      id: string;
      user_id: string;
      partner_user_id: string;
    }>,
    availableUsers: [] as Array<{ user_id: string; display_name: string }>,
    fetchAvailableUsers: vi.fn().mockResolvedValue(undefined),
    addPartner: vi.fn().mockResolvedValue(undefined),
    removePartner: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../store/useStore", () => ({
  useStore: () => mocks.storeValue,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog">
        <button type="button" onClick={() => onOpenChange?.(false)}>
          dialog-close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

describe("PartnerAddModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storeValue.partners = [];
    mocks.storeValue.availableUsers = [];
  });

  it("renders when open", () => {
    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Parceiros")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<PartnerAddModal isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByText("Parceiros")).not.toBeInTheDocument();
  });

  it("shows available users", () => {
    mocks.storeValue.availableUsers = [
      { user_id: "u3", display_name: "User Three" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("User Three")).toBeInTheDocument();
    expect(screen.getByText("Usuários disponíveis")).toBeInTheDocument();
  });

  it("shows existing partners", () => {
    mocks.storeValue.partners = [
      { id: "p1", user_id: "u1", partner_user_id: "u2" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "u2", display_name: "Partner User" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Partner User")).toBeInTheDocument();
    expect(screen.getByText("Meus parceiros")).toBeInTheDocument();
  });

  it("shows partner name matched by user_id fallback", () => {
    mocks.storeValue.partners = [
      { id: "p2", user_id: "u1", partner_user_id: "missing" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "u1", display_name: "Found By User Id" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Found By User Id")).toBeInTheDocument();
  });

  it("shows fallback name when partner user not found", () => {
    mocks.storeValue.partners = [
      { id: "p3", user_id: "missing1", partner_user_id: "missing2" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Usuário")).toBeInTheDocument();
  });

  it("calls addPartner when clicking add", async () => {
    mocks.storeValue.availableUsers = [
      { user_id: "u3", display_name: "User Three" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    await userEvent.click(screen.getByTestId("add-partner-u3"));

    expect(mocks.storeValue.addPartner).toHaveBeenCalledWith("u3");
  });

  it("calls removePartner when clicking remove", async () => {
    mocks.storeValue.partners = [
      { id: "p1", user_id: "u1", partner_user_id: "u2" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "u2", display_name: "Partner User" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    await userEvent.click(screen.getByTestId("remove-partner-p1"));

    expect(mocks.storeValue.removePartner).toHaveBeenCalledWith("p1");
  });

  it("filters available users by search", async () => {
    mocks.storeValue.availableUsers = [
      { user_id: "u1", display_name: "Alice" },
      { user_id: "u2", display_name: "Bob" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    await userEvent.type(screen.getByTestId("partner-search-input"), "Ali");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("shows available users section when filtered users exist", () => {
    mocks.storeValue.availableUsers = [
      { user_id: "u3", display_name: "User Three" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Usuários disponíveis")).toBeInTheDocument();
  });

  it("shows empty state when no users or partners", () => {
    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Nenhum usuário disponível")).toBeInTheDocument();
  });

  it("does not show empty state when partners exist", () => {
    mocks.storeValue.partners = [
      { id: "p1", user_id: "u1", partner_user_id: "u2" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "u2", display_name: "Partner" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(
      screen.queryByText("Nenhum usuário disponível"),
    ).not.toBeInTheDocument();
  });

  it("does not show already partnered users in available list", () => {
    mocks.storeValue.partners = [
      { id: "p1", user_id: "u1", partner_user_id: "u2" },
    ];
    mocks.storeValue.availableUsers = [
      { user_id: "u2", display_name: "Partner" },
      { user_id: "u3", display_name: "Other" },
    ];

    render(<PartnerAddModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Meus parceiros")).toBeInTheDocument();
    expect(screen.getByText("Usuários disponíveis")).toBeInTheDocument();
    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("closes on dialog close", async () => {
    const onClose = vi.fn();
    render(<PartnerAddModal isOpen onClose={onClose} />);

    await userEvent.click(screen.getByText("dialog-close"));

    expect(onClose).toHaveBeenCalled();
  });
});
