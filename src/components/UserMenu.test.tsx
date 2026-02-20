import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserMenu } from './UserMenu'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOutToGuest: vi.fn(),
  signOutFully: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOutToGuest: mocks.signOutToGuest,
    signOutFully: mocks.signOutFully,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('./LogoutChoiceDialog', () => ({
  LogoutChoiceDialog: ({
    open,
    onContinueAsGuest,
    onSignOutFully,
  }: {
    open: boolean
    onContinueAsGuest: () => void
    onSignOutFully: () => void
  }) =>
    open ? (
      <div>
        <button type="button" onClick={onContinueAsGuest}>
          Continue as guest
        </button>
        <button type="button" onClick={onSignOutFully}>
          Sign out fully
        </button>
      </div>
    ) : null,
}))

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOutToGuest.mockResolvedValue(undefined)
    mocks.signOutFully.mockResolvedValue(undefined)
  })

  async function openLogoutDialog() {
    render(
      <UserMenu
        user={{
          id: 'user-1',
          displayName: 'Alice',
          email: 'alice@example.com',
          provider: 'email',
          isAnonymous: false,
        }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /sair/i }))
  }

  it('renders fallback user labels when displayName and email are missing', () => {
    render(
      <UserMenu
        user={{
          id: 'user-1',
          provider: 'email',
          isAnonymous: false,
        }}
      />,
    )

    expect(screen.getByText('Usuário')).toBeInTheDocument()
    expect(screen.getByText('Sem email')).toBeInTheDocument()
  })

  it.each([
    {
      caseName: 'continue as guest success',
      actionLabel: 'Continue as guest',
      setup: () => mocks.signOutToGuest.mockResolvedValue(undefined),
      expectedNavigate: { to: '/', replace: true },
      expectedToast: false,
    },
    {
      caseName: 'continue as guest failure',
      actionLabel: 'Continue as guest',
      setup: () => mocks.signOutToGuest.mockRejectedValue(new Error('failed')),
      expectedNavigate: null,
      expectedToast: true,
    },
    {
      caseName: 'sign out fully success',
      actionLabel: 'Sign out fully',
      setup: () => mocks.signOutFully.mockResolvedValue(undefined),
      expectedNavigate: { to: '/auth', replace: true },
      expectedToast: false,
    },
    {
      caseName: 'sign out fully failure',
      actionLabel: 'Sign out fully',
      setup: () => mocks.signOutFully.mockRejectedValue(new Error('failed')),
      expectedNavigate: null,
      expectedToast: true,
    },
  ])('handles $caseName', async ({ actionLabel, setup, expectedNavigate, expectedToast }) => {
    setup()
    await openLogoutDialog()

    await userEvent.click(screen.getByRole('button', { name: actionLabel }))

    await waitFor(() => {
      if (expectedNavigate) {
        expect(mocks.navigate).toHaveBeenCalledWith(expectedNavigate)
      } else if (expectedToast) {
        expect(mocks.toastError).toHaveBeenCalled()
      }
    })
  })
})
