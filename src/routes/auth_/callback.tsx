import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { MigrationConflictModal } from '@/components/MigrationConflictModal'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getPostLoginDestination } from '@/lib/postLoginNavigation'
import { authService } from '@/services/auth'

type CallbackState = 'loading' | 'conflict' | 'error'

export const Route = createFileRoute('/auth_/callback')({
  component: AuthCallbackRouteComponent,
})

function AuthCallbackRouteComponent() {
  const navigate = useNavigate()
  const { status, user } = useAuth()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const redirectAfterLogin = useCallback(() => {
    const target = getPostLoginDestination(authService.consumePostLoginTarget())
    navigate({ ...target, replace: true })
  }, [navigate])

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'none') {
      navigate({ to: '/auth', replace: true })
      return
    }

    let cancelled = false

    const finalize = async () => {
      try {
        const result = await authService.finalizePostLogin()
        if (cancelled) return

        if (!result.userId) {
          setState('error')
          setErrorMessage('Sessão inválida após o callback de autenticação.')
          return
        }

        if (result.migrationConflict) {
          setState('conflict')
          return
        }

        redirectAfterLogin()
      } catch (error) {
        console.error('Auth callback finalization failed:', error)
        if (!cancelled) {
          setState('error')
          setErrorMessage('Erro ao finalizar login. Tente novamente.')
        }
      }
    }

    void finalize()

    return () => {
      cancelled = true
    }
  }, [navigate, redirectAfterLogin, status, user?.id])

  const handleKeepLocal = async () => {
    try {
      const oldUserId = localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY)
      const newUserId = user?.id ?? await authService.getUserId()

      if (oldUserId && newUserId) {
        await authService.migrateAnonymousData(oldUserId, newUserId)
      }

      authService.clearMigrationOldUserId()
      redirectAfterLogin()
    } catch (error) {
      console.error('Manual migration from callback failed:', error)
      setState('error')
      setErrorMessage('Não foi possível migrar seus dados locais.')
    }
  }

  const handleUseAccount = async () => {
    try {
      authService.clearMigrationOldUserId()
      redirectAfterLogin()
    } catch (error) {
      console.error('Failed to complete callback with account data:', error)
      setState('error')
      setErrorMessage('Não foi possível concluir o login com os dados da conta.')
    }
  }

  if (state === 'error') {
    return (
      <div data-testid="route-auth-callback" className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Falha no login</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Button onClick={() => navigate({ to: '/auth', replace: true })}>
            Voltar para autenticação
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div data-testid="route-auth-callback" className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Finalizando autenticação...</p>
        </div>
      </div>

      <MigrationConflictModal
        isOpen={state === 'conflict'}
        onKeepLocal={() => {
          void handleKeepLocal()
        }}
        onUseAccount={() => {
          void handleUseAccount()
        }}
      />
    </>
  )
}
