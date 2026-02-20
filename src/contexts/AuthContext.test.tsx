import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider, useAuth } from './AuthContext'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  authStateChangeCallback: undefined as ((event: string, session: unknown) => void) | undefined,
  unsubscribe: vi.fn(),
  getUserProfile: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithOtp: vi.fn(),
  signInAnonymously: vi.fn(),
  signOutToGuest: vi.fn(),
  signOutFully: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
      onAuthStateChange: (...args: unknown[]) => mocks.onAuthStateChange(...args),
    },
  },
}))

vi.mock('../services/auth', () => ({
  authService: {
    getUserProfile: (...args: unknown[]) => mocks.getUserProfile(...args),
    signInWithGoogle: (...args: unknown[]) => mocks.signInWithGoogle(...args),
    signInWithOtp: (...args: unknown[]) => mocks.signInWithOtp(...args),
    signInAnonymously: (...args: unknown[]) => mocks.signInAnonymously(...args),
    signOutToGuest: (...args: unknown[]) => mocks.signOutToGuest(...args),
    signOutFully: (...args: unknown[]) => mocks.signOutFully(...args),
  },
}))

function AuthConsumer() {
  const {
    status,
    user,
    refreshProfile,
    signInWithGoogle,
    signInWithOtp,
    continueAsGuest,
    signOutToGuest,
    signOutFully,
  } = useAuth()

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user-id">{user?.id ?? 'none'}</span>
      <button type="button" onClick={() => void refreshProfile()}>
        refresh
      </button>
      <button type="button" onClick={() => void signInWithGoogle()}>
        google
      </button>
      <button type="button" onClick={() => void signInWithOtp('alice@example.com')}>
        otp
      </button>
      <button type="button" onClick={() => void continueAsGuest()}>
        guest
      </button>
      <button type="button" onClick={() => void signOutToGuest()}>
        signout-guest
      </button>
      <button type="button" onClick={() => void signOutFully()}>
        signout-full
      </button>
    </div>
  )
}

function renderWithProvider(children: ReactNode = <AuthConsumer />) {
  return render(<AuthProvider>{children}</AuthProvider>)
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({
      data: { session: null },
    })
    mocks.getUserProfile.mockResolvedValue(null)
    mocks.signInWithGoogle.mockResolvedValue(undefined)
    mocks.signInWithOtp.mockResolvedValue(undefined)
    mocks.signInAnonymously.mockResolvedValue('anon-1')
    mocks.signOutToGuest.mockResolvedValue(undefined)
    mocks.signOutFully.mockResolvedValue(undefined)
    mocks.onAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      mocks.authStateChangeCallback = callback
      return {
        data: {
          subscription: {
            unsubscribe: mocks.unsubscribe,
          },
        },
      }
    })
  })

  it('throws when useAuth is used outside provider', () => {
    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within an AuthProvider')
  })

  it('sets none status when initial session is missing', async () => {
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
      expect(screen.getByTestId('user-id')).toHaveTextContent('none')
    })
  })

  it.each([
    {
      caseName: 'anonymous profile',
      profile: { id: 'anon-1', provider: 'anonymous', isAnonymous: true },
      expectedStatus: 'anonymous',
    },
    {
      caseName: 'authenticated profile',
      profile: { id: 'user-1', provider: 'google', isAnonymous: false },
      expectedStatus: 'authenticated',
    },
  ])('loads $caseName from initial session', async ({ profile, expectedStatus }) => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: 'token' },
      },
    })
    mocks.getUserProfile.mockResolvedValue(profile)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent(expectedStatus)
      expect(screen.getByTestId('user-id')).toHaveTextContent(profile.id)
    })
  })

  it('sets none when profile cannot be loaded for existing session', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: 'token' },
      },
    })
    mocks.getUserProfile.mockResolvedValue(null)

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
    })
  })

  it('handles auth state change callback', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
    })
    mocks.getUserProfile.mockResolvedValue({
      id: 'user-2',
      provider: 'email',
      isAnonymous: false,
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
    })

    mocks.authStateChangeCallback?.('SIGNED_IN', { access_token: 'token' })

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-2')
    })
  })

  it('refreshProfile updates status and user', async () => {
    mocks.getUserProfile.mockResolvedValue({
      id: 'anon-1',
      provider: 'anonymous',
      isAnonymous: true,
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
    })

    await userEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
      expect(screen.getByTestId('user-id')).toHaveTextContent('anon-1')
    })
  })

  it('refreshProfile sets authenticated status for non-anonymous profile', async () => {
    mocks.getUserProfile.mockResolvedValue({
      id: 'user-99',
      provider: 'google',
      isAnonymous: false,
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
    })

    await userEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-99')
    })
  })

  it('refreshProfile clears state when profile is missing', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: 'token' },
      },
    })
    mocks.getUserProfile.mockResolvedValue({
      id: 'user-1',
      provider: 'email',
      isAnonymous: false,
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })

    mocks.getUserProfile.mockResolvedValue(null)

    await userEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
      expect(screen.getByTestId('user-id')).toHaveTextContent('none')
    })
  })

  it('ignores stale applySession result when a newer auth update arrives first', async () => {
    let resolveFirst: ((value: unknown) => void) | undefined
    const firstProfilePromise = new Promise((resolve) => {
      resolveFirst = resolve
    })

    mocks.getSession.mockResolvedValue({
      data: {
        session: { access_token: 'initial' },
      },
    })
    mocks.getUserProfile
      .mockImplementationOnce(() => firstProfilePromise)
      .mockResolvedValueOnce({
        id: 'newer-user',
        provider: 'google',
        isAnonymous: false,
      })

    renderWithProvider()

    mocks.authStateChangeCallback?.('SIGNED_IN', { access_token: 'newer' })

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('newer-user')
    })

    resolveFirst?.({
      id: 'stale-user',
      provider: 'email',
      isAnonymous: false,
    })
    await Promise.resolve()

    expect(screen.getByTestId('user-id')).toHaveTextContent('newer-user')
  })

  it('calls context auth actions', async () => {
    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('none')
    })

    await userEvent.click(screen.getByRole('button', { name: 'google' }))
    await userEvent.click(screen.getByRole('button', { name: 'otp' }))
    await userEvent.click(screen.getByRole('button', { name: 'guest' }))
    await userEvent.click(screen.getByRole('button', { name: 'signout-guest' }))
    await userEvent.click(screen.getByRole('button', { name: 'signout-full' }))

    expect(mocks.signInWithGoogle).toHaveBeenCalledOnce()
    expect(mocks.signInWithOtp).toHaveBeenCalledWith('alice@example.com')
    expect(mocks.signInAnonymously).toHaveBeenCalledOnce()
    expect(mocks.signOutToGuest).toHaveBeenCalledOnce()
    expect(mocks.signOutFully).toHaveBeenCalledOnce()
  })

  it('unsubscribes from auth listener on unmount', async () => {
    const { unmount } = renderWithProvider()

    await waitFor(() => {
      expect(mocks.getSession).toHaveBeenCalled()
    })

    unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it('does not apply initial session after unmount when initialize resolves late', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    const delayedSessionPromise = new Promise((resolve) => {
      resolveSession = resolve
    })
    mocks.getSession.mockImplementation(() => delayedSessionPromise)

    const { unmount } = renderWithProvider()
    unmount()

    resolveSession?.({
      data: {
        session: { access_token: 'late' },
      },
    })
    await Promise.resolve()

    expect(mocks.getUserProfile).not.toHaveBeenCalled()
  })
})
