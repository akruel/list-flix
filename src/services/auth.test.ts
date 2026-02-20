// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '../lib/supabase'
import { authService } from './auth'
import { migrationService } from './migrationService'
import { userContentService } from './userContent'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
      signInAnonymously: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

vi.mock('./migrationService', () => ({
  migrationService: {
    migrateAnonymousUserData: vi.fn(),
  },
}))

vi.mock('./userContent', () => ({
  userContentService: {
    hasData: vi.fn(),
  },
}))

type MockFn = ReturnType<typeof vi.fn>

const mockedSupabase = supabase as unknown as {
  auth: {
    getUser: MockFn
    getSession: MockFn
    signInWithOAuth: MockFn
    signInWithOtp: MockFn
    signInAnonymously: MockFn
    signOut: MockFn
    updateUser: MockFn
  }
}

const mockedMigrationService = migrationService as unknown as {
  migrateAnonymousUserData: MockFn
}

const mockedUserContentService = userContentService as unknown as {
  hasData: MockFn
}

describe('authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    localStorage.clear()

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })
    mockedSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null })
    mockedSupabase.auth.signInWithOtp.mockResolvedValue({ error: null })
    mockedSupabase.auth.signInAnonymously.mockResolvedValue({
      data: { user: { id: 'guest-1' } },
      error: null,
    })
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null })
    mockedSupabase.auth.updateUser.mockResolvedValue({ error: null })
    mockedUserContentService.hasData.mockResolvedValue(false)
    mockedMigrationService.migrateAnonymousUserData.mockResolvedValue(undefined)
  })

  const signInCases = [
    {
      caseName: 'google sign in',
      run: () => authService.signInWithGoogle(),
      expectCall: () =>
        expect(mockedSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
    },
    {
      caseName: 'otp sign in',
      run: () => authService.signInWithOtp('alice@example.com'),
      expectCall: () =>
        expect(mockedSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'alice@example.com',
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
    },
  ]

  it.each(signInCases)('stores migration source and triggers $caseName', async ({ run, expectCall }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'anon-1',
          is_anonymous: true,
        },
      },
    })

    await run()

    expect(localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)).toBe('anon-1')
    expectCall()
  })

  it.each(signInCases)('throws when $caseName fails', async ({ run, caseName }) => {
    if (caseName === 'google sign in') {
      mockedSupabase.auth.signInWithOAuth.mockResolvedValue({
        error: new Error('oauth failed'),
      })
    } else {
      mockedSupabase.auth.signInWithOtp.mockResolvedValue({
        error: new Error('otp failed'),
      })
    }

    await expect(run()).rejects.toThrow(
      caseName === 'google sign in' ? 'oauth failed' : 'otp failed',
    )
  })

  it('returns current anonymous id in signInAnonymously', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'anon-1', is_anonymous: true },
      },
    })

    await expect(authService.signInAnonymously()).resolves.toBe('anon-1')
    expect(mockedSupabase.auth.signInAnonymously).not.toHaveBeenCalled()
  })

  it('creates anonymous session when current user is not anonymous', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'auth-1', is_anonymous: false },
      },
    })
    mockedSupabase.auth.signInAnonymously.mockResolvedValue({
      data: { user: { id: 'anon-2' } },
      error: null,
    })

    await expect(authService.signInAnonymously()).resolves.toBe('anon-2')
  })

  it('returns null when anonymous sign in response has no user id', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    })
    mockedSupabase.auth.signInAnonymously.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(authService.signInAnonymously()).resolves.toBeNull()
  })

  it('throws when anonymous sign in fails', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    })
    mockedSupabase.auth.signInAnonymously.mockResolvedValue({
      data: { user: null },
      error: new Error('anonymous failed'),
    })

    await expect(authService.signInAnonymously()).rejects.toThrow('anonymous failed')
  })

  it('signOutFully clears migration key and signs out', async () => {
    localStorage.setItem(authService.MIGRATION_OLD_USER_ID_KEY, 'anon-1')

    await authService.signOutFully()

    expect(mockedSupabase.auth.signOut).toHaveBeenCalledOnce()
    expect(localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)).toBeNull()
  })

  it('signOutFully throws when signOut fails', async () => {
    mockedSupabase.auth.signOut.mockResolvedValue({
      error: new Error('signout failed'),
    })

    await expect(authService.signOutFully()).rejects.toThrow('signout failed')
  })

  it('signOutToGuest signs out and then creates anonymous session', async () => {
    const signOutSpy = vi.spyOn(authService, 'signOutFully').mockResolvedValue()
    const signInAnonSpy = vi.spyOn(authService, 'signInAnonymously').mockResolvedValue('anon-1')

    await authService.signOutToGuest()

    expect(signOutSpy).toHaveBeenCalledOnce()
    expect(signInAnonSpy).toHaveBeenCalledOnce()
  })

  it('finalizePostLogin returns null user when there is no session', async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    await expect(authService.finalizePostLogin()).resolves.toEqual({
      userId: null,
      isAnonymous: false,
      migrationConflict: false,
    })
  })

  it('finalizePostLogin returns anonymous session without migration', async () => {
    const ensureSpy = vi.spyOn(authService, 'ensureDisplayName').mockResolvedValue()
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'anon-1',
            is_anonymous: true,
          },
        },
      },
    })

    await expect(authService.finalizePostLogin()).resolves.toEqual({
      userId: 'anon-1',
      isAnonymous: true,
      migrationConflict: false,
    })

    expect(ensureSpy).not.toHaveBeenCalled()
  })

  it.each([
    { caseName: 'remote data conflict', hasRemoteData: true, shouldMigrate: false },
    { caseName: 'migrate local data', hasRemoteData: false, shouldMigrate: true },
  ])(
    'finalizePostLogin handles migration path: $caseName',
    async ({ hasRemoteData, shouldMigrate }) => {
      localStorage.setItem(authService.MIGRATION_OLD_USER_ID_KEY, 'anon-1')
      const ensureSpy = vi.spyOn(authService, 'ensureDisplayName').mockResolvedValue()
      mockedSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'auth-1',
              is_anonymous: false,
            },
          },
        },
      })
      mockedUserContentService.hasData.mockResolvedValue(hasRemoteData)

      const result = await authService.finalizePostLogin()

      expect(result.userId).toBe('auth-1')
      expect(result.isAnonymous).toBe(false)
      expect(result.migrationConflict).toBe(hasRemoteData)

      if (shouldMigrate) {
        expect(mockedMigrationService.migrateAnonymousUserData).toHaveBeenCalledWith('anon-1', 'auth-1')
        expect(localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)).toBeNull()
      } else {
        expect(mockedMigrationService.migrateAnonymousUserData).not.toHaveBeenCalled()
      }

      expect(ensureSpy).toHaveBeenCalledOnce()
    },
  )

  it('finalizePostLogin marks conflict when migration check throws', async () => {
    localStorage.setItem(authService.MIGRATION_OLD_USER_ID_KEY, 'anon-1')
    vi.spyOn(authService, 'ensureDisplayName').mockResolvedValue()
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'auth-1',
            is_anonymous: false,
          },
        },
      },
    })
    mockedUserContentService.hasData.mockRejectedValue(new Error('check failed'))

    await expect(authService.finalizePostLogin()).resolves.toEqual({
      userId: 'auth-1',
      isAnonymous: false,
      migrationConflict: true,
    })
  })

  it('finalizePostLogin ignores migration when old and new users are equal', async () => {
    localStorage.setItem(authService.MIGRATION_OLD_USER_ID_KEY, 'auth-1')
    vi.spyOn(authService, 'ensureDisplayName').mockResolvedValue()
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'auth-1',
            is_anonymous: false,
          },
        },
      },
    })

    await authService.finalizePostLogin()

    expect(mockedUserContentService.hasData).not.toHaveBeenCalled()
    expect(mockedMigrationService.migrateAnonymousUserData).not.toHaveBeenCalled()
  })

  it('finalizePostLogin defaults isAnonymous to false when session user omits flag', async () => {
    vi.spyOn(authService, 'ensureDisplayName').mockResolvedValue()
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'auth-1',
          },
        },
      },
    })

    await expect(authService.finalizePostLogin()).resolves.toEqual({
      userId: 'auth-1',
      isAnonymous: false,
      migrationConflict: false,
    })
  })

  it.each([
    { caseName: 'user id from getUser', user: { id: 'user-1' }, expected: 'user-1' },
    { caseName: 'missing user id', user: null, expected: null },
  ])('returns $caseName in getUserId', async ({ user, expected }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user },
    })

    await expect(authService.getUserId()).resolves.toBe(expected)
  })

  it.each([
    { caseName: 'anonymous user', user: { id: 'anon-1', is_anonymous: true }, expected: true },
    { caseName: 'authenticated user', user: { id: 'auth-1', is_anonymous: false }, expected: false },
    { caseName: 'missing user', user: null, expected: false },
  ])('returns $caseName in isAnonymous', async ({ user, expected }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user },
    })

    await expect(authService.isAnonymous()).resolves.toBe(expected)
  })

  it('returns null profile when user is missing', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    await expect(authService.getUserProfile()).resolves.toBeNull()
  })

  it.each([
    {
      caseName: 'anonymous provider overrides app provider',
      user: {
        id: 'anon-1',
        email: 'anon@example.com',
        is_anonymous: true,
        app_metadata: { provider: 'google' },
        user_metadata: {},
      },
      expectedProvider: 'anonymous',
      expectedDisplayName: 'anon',
    },
    {
      caseName: 'email provider with display_name',
      user: {
        id: 'user-1',
        email: 'alice@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'email' },
        user_metadata: { display_name: 'Alice' },
      },
      expectedProvider: 'email',
      expectedDisplayName: 'Alice',
    },
    {
      caseName: 'google provider with full_name',
      user: {
        id: 'user-2',
        email: 'bob@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'Bob Full' },
      },
      expectedProvider: 'google',
      expectedDisplayName: 'Bob Full',
    },
    {
      caseName: 'unknown provider with name fallback',
      user: {
        id: 'user-3',
        email: 'carol@example.com',
        is_anonymous: false,
        app_metadata: { provider: 'github' },
        user_metadata: { name: 'Carol Name' },
      },
      expectedProvider: 'unknown',
      expectedDisplayName: 'Carol Name',
    },
    {
      caseName: 'missing email and metadata fall back to undefined display name',
      user: {
        id: 'user-4',
        is_anonymous: undefined,
        app_metadata: { provider: 'email' },
        user_metadata: {},
      },
      expectedProvider: 'email',
      expectedDisplayName: undefined,
    },
  ])('maps profile data for $caseName', async ({ user, expectedProvider, expectedDisplayName }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user },
    })

    const profile = await authService.getUserProfile()

    expect(profile?.provider).toBe(expectedProvider)
    expect(profile?.displayName).toBe(expectedDisplayName)
    if (user.is_anonymous === undefined) {
      expect(profile?.isAnonymous).toBe(false)
    }
  })

  it.each([
    {
      caseName: 'valid invite path',
      path: '/lists/list-1/join?role=editor',
      shouldStore: true,
    },
    {
      caseName: 'invalid non invite path',
      path: '/search?q=matrix',
      shouldStore: false,
    },
  ])('savePostLoginTarget handles $caseName', ({ path, shouldStore }) => {
    authService.savePostLoginTarget(path)

    const stored = localStorage.getItem(authService.AUTH_POST_LOGIN_TARGET_KEY)
    expect(stored).toBe(shouldStore ? path : null)
  })

  it('consumePostLoginTarget returns and clears a valid invite target', () => {
    localStorage.setItem(authService.AUTH_POST_LOGIN_TARGET_KEY, '/lists/list-1/join?role=viewer')

    expect(authService.consumePostLoginTarget()).toBe('/lists/list-1/join?role=viewer')
    expect(localStorage.getItem(authService.AUTH_POST_LOGIN_TARGET_KEY)).toBeNull()
  })

  it('consumePostLoginTarget clears and discards invalid target', () => {
    localStorage.setItem(authService.AUTH_POST_LOGIN_TARGET_KEY, '/search')

    expect(authService.consumePostLoginTarget()).toBeNull()
    expect(localStorage.getItem(authService.AUTH_POST_LOGIN_TARGET_KEY)).toBeNull()
  })

  it('consumePostLoginTarget returns null when no target exists', () => {
    expect(authService.consumePostLoginTarget()).toBeNull()
  })

  it('getPostLoginTarget returns only valid invite paths', () => {
    localStorage.setItem(authService.AUTH_POST_LOGIN_TARGET_KEY, '/search')
    expect(authService.getPostLoginTarget()).toBeNull()

    localStorage.setItem(authService.AUTH_POST_LOGIN_TARGET_KEY, '/lists/list-2/join?role=editor')
    expect(authService.getPostLoginTarget()).toBe('/lists/list-2/join?role=editor')
  })

  it('getPostLoginTarget returns null when no target exists', () => {
    expect(authService.getPostLoginTarget()).toBeNull()
  })

  it('clearMigrationOldUserId clears local migration state', () => {
    localStorage.setItem(authService.MIGRATION_OLD_USER_ID_KEY, 'anon-1')

    authService.clearMigrationOldUserId()

    expect(localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)).toBeNull()
  })

  it.each([
    {
      caseName: 'anonymous user stores id',
      user: { id: 'anon-1', is_anonymous: true },
      expected: 'anon-1',
    },
    {
      caseName: 'authenticated user does not store id',
      user: { id: 'auth-1', is_anonymous: false },
      expected: null,
    },
    {
      caseName: 'missing user does not store id',
      user: null,
      expected: null,
    },
  ])('storeMigrationSourceIfAnonymous for $caseName', async ({ user, expected }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user },
    })

    await authService.storeMigrationSourceIfAnonymous()

    expect(localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)).toBe(expected)
  })

  it.each([
    {
      caseName: 'missing user',
      user: null,
      shouldUpdate: false,
    },
    {
      caseName: 'anonymous user',
      user: {
        id: 'anon-1',
        is_anonymous: true,
        email: 'anon@example.com',
        user_metadata: {},
      },
      shouldUpdate: false,
    },
    {
      caseName: 'user already has display_name',
      user: {
        id: 'user-1',
        is_anonymous: false,
        email: 'alice@example.com',
        user_metadata: { display_name: 'Alice' },
      },
      shouldUpdate: false,
    },
  ])('ensureDisplayName does not update for $caseName', async ({ user, shouldUpdate }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user },
    })

    await authService.ensureDisplayName()

    expect(mockedSupabase.auth.updateUser).toHaveBeenCalledTimes(shouldUpdate ? 1 : 0)
  })

  it('ensureDisplayName updates using email prefix when metadata is missing', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          is_anonymous: false,
          email: 'alice@example.com',
          user_metadata: {},
        },
      },
    })

    await authService.ensureDisplayName()

    expect(mockedSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { display_name: 'alice' },
    })
  })
})
