import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginButton } from './LoginButton'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuth(),
}))

vi.mock('./UserMenu', () => ({
  UserMenu: ({ user }: { user: { displayName?: string } }) => (
    <div data-testid="user-menu">{user.displayName ?? 'user'}</div>
  ),
}))

vi.mock('./LoginOptionsDialog', () => ({
  LoginOptionsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="login-options-open">dialog open</div> : null,
}))

describe('LoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skeleton while auth status is loading', () => {
    mocks.useAuth.mockReturnValue({
      status: 'loading',
      user: null,
    })

    const { container } = render(<LoginButton />)

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('renders user menu when user is authenticated', () => {
    mocks.useAuth.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        displayName: 'Alice',
      },
    })

    render(<LoginButton />)

    expect(screen.getByTestId('user-menu')).toHaveTextContent('Alice')
  })

  it.each([
    {
      caseName: 'anonymous status opens login options',
      status: 'anonymous',
      shouldNavigate: false,
      dialogVisible: true,
    },
    {
      caseName: 'unauthenticated status navigates to auth',
      status: 'none',
      shouldNavigate: true,
      dialogVisible: false,
    },
  ])('handles click for $caseName', async ({ status, shouldNavigate, dialogVisible }) => {
    mocks.useAuth.mockReturnValue({
      status,
      user: null,
    })

    render(<LoginButton />)

    await userEvent.click(screen.getByRole('button'))

    if (shouldNavigate) {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth' })
      expect(screen.queryByTestId('login-options-open')).not.toBeInTheDocument()
    } else {
      expect(mocks.navigate).not.toHaveBeenCalled()
      if (dialogVisible) {
        expect(screen.getByTestId('login-options-open')).toBeInTheDocument()
      }
    }
  })
})
