import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '../lib/supabase'
import { migrationService } from './migrationService'

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: toastMocks,
}))

type MockFn = ReturnType<typeof vi.fn>

const mockedSupabase = supabase as unknown as {
  rpc: MockFn
}

describe('migrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSupabase.rpc.mockResolvedValue({ error: null })
  })

  it.each([
    { caseName: 'missing old user id', oldUserId: '', newUserId: 'new-1' },
    { caseName: 'missing new user id', oldUserId: 'old-1', newUserId: '' },
    { caseName: 'same user ids', oldUserId: 'user-1', newUserId: 'user-1' },
  ])('skips migration for $caseName', async ({ oldUserId, newUserId }) => {
    await expect(migrationService.migrateAnonymousUserData(oldUserId, newUserId)).resolves.toBeUndefined()

    expect(mockedSupabase.rpc).not.toHaveBeenCalled()
    expect(toastMocks.success).not.toHaveBeenCalled()
    expect(toastMocks.error).not.toHaveBeenCalled()
  })

  it('runs migration and shows success toast', async () => {
    await migrationService.migrateAnonymousUserData('old-1', 'new-1')

    expect(mockedSupabase.rpc).toHaveBeenCalledWith('migrate_user_data', {
      old_user_id: 'old-1',
      new_user_id: 'new-1',
    })
    expect(toastMocks.success).toHaveBeenCalledWith('Suas listas e dados foram migrados com sucesso!', {
      id: 'migration-success',
      duration: 3000,
      closeButton: false,
    })
  })

  it.each([
    {
      caseName: 'rpc returns error',
      setup: () => mockedSupabase.rpc.mockResolvedValue({ error: new Error('rpc failed') }),
    },
    {
      caseName: 'rpc throws',
      setup: () => mockedSupabase.rpc.mockRejectedValue(new Error('rpc crashed')),
    },
  ])('handles failures for $caseName', async ({ setup }) => {
    setup()

    await expect(migrationService.migrateAnonymousUserData('old-1', 'new-1')).resolves.toBeUndefined()

    expect(toastMocks.error).toHaveBeenCalledWith(
      'Houve um problema ao migrar seus dados. Por favor, contate o suporte.',
    )
  })
})
