import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { authService } from '@/services/auth'
import { listService } from '@/services/listService'

type JoinRouteSearch = {
  role?: 'editor' | 'viewer'
}

export const Route = createFileRoute('/_protected/lists/$id/join')({
  validateSearch: (search: Record<string, unknown>): JoinRouteSearch => ({
    role: search.role === 'editor' || search.role === 'viewer' ? search.role : undefined,
  }),
  component: JoinListRouteComponent,
})

function JoinListRouteComponent() {
  const { id } = Route.useParams()
  const { role = 'viewer' } = Route.useSearch()
  const navigate = useNavigate()
  const joinSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [status, setStatus] = useState<
    'loading' | 'input' | 'confirm' | 'joining' | 'success' | 'error'
  >('loading')
  const [listName, setListName] = useState<string>('')
  const [memberName, setMemberName] = useState<string>('')
  const [error, setError] = useState<string>('')
  const isBlockingClose = status === 'joining' || status === 'success'

  const closeToLists = () => {
    navigate({ to: '/lists' })
  }

  useEffect(() => {
    const init = async () => {
      try {
        const name = await listService.getListName(id)
        setListName(name)

        const profile = await authService.getUserProfile()
        if (profile && !profile.isAnonymous && profile.displayName) {
          setMemberName(profile.displayName)
          setStatus('confirm')
          return
        }

        setStatus('input')
      } catch (err) {
        console.error(err)
        setStatus('error')
        setError('Não foi possível carregar os detalhes da lista.')
      }
    }

    void init()
  }, [id])

  useEffect(() => {
    return () => {
      if (joinSuccessTimeoutRef.current) {
        clearTimeout(joinSuccessTimeoutRef.current)
        joinSuccessTimeoutRef.current = null
      }
    }
  }, [])

  const handleJoinSubmit = async () => {
    if (!memberName.trim()) return

    setStatus('joining')
    try {
      await listService.joinList(id, memberName, role)
      setStatus('success')
      joinSuccessTimeoutRef.current = setTimeout(() => {
        navigate({ to: '/lists/$id', params: { id } })
      }, 1500)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setError('Não foi possível entrar na lista.')
    }
  }

  const handleJoin = (e: FormEvent) => {
    e.preventDefault()
    void handleJoinSubmit()
  }

  const handleDialogChange = (open: boolean) => {
    if (!open && !isBlockingClose) {
      closeToLists()
    }
  }

  const roleBadgeClassName =
    role === 'editor'
      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50'
      : 'bg-blue-600/20 text-blue-400 border border-blue-500/50'

  const roleDescription =
    role === 'editor'
      ? 'Você poderá adicionar e remover itens desta lista.'
      : 'Você terá acesso somente para visualizar esta lista.'

  const roleLabel = role === 'editor' ? '✏️ Editor' : '👁️ Visualizador'

  return (
    <Dialog open={true} onOpenChange={handleDialogChange}>
      <DialogContent
        data-testid="route-list-join"
        className="w-full max-w-md bg-card text-card-foreground"
        hideClose={isBlockingClose}
        onEscapeKeyDown={(event) => {
          if (isBlockingClose) {
            event.preventDefault()
          }
        }}
        onPointerDownOutside={(event) => {
          if (isBlockingClose) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle>Entrar na lista</DialogTitle>
          <DialogDescription>
            Você foi convidado para participar da lista{' '}
            <span className="font-semibold text-foreground">"{listName || '...'}"</span>.
          </DialogDescription>
        </DialogHeader>

        {status === 'loading' && (
          <div className="py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Carregando detalhes da lista...</p>
          </div>
        )}

        {status === 'input' && (
          <>
            <div className="text-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleBadgeClassName}`}
              >
                {roleLabel}
              </span>
              <p className="text-xs text-muted-foreground mt-2">{roleDescription}</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="join-member-name" className="text-sm font-medium">
                  Seu nome
                </label>
                <Input
                  id="join-member-name"
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Digite seu nome"
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeToLists}>
                  Cancelar
                </Button>
                <Button type="submit">Entrar na lista</Button>
              </DialogFooter>
            </form>
          </>
        )}

        {status === 'confirm' && (
          <div className="text-center">
            <p className="text-muted-foreground mb-5">
              Entrando na lista{' '}
              <span className="font-semibold text-foreground">"{listName}"</span> como{' '}
              <span className="font-semibold text-primary">{memberName}</span>
            </p>

            <div className="mb-6 text-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleBadgeClassName}`}
              >
                {roleLabel}
              </span>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeToLists}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleJoinSubmit()
                }}
              >
                Confirmar entrada
              </Button>
            </DialogFooter>
            <Button
              type="button"
              variant="link"
              onClick={() => setStatus('input')}
              className="mt-2"
            >
              Entrar com outro nome
            </Button>
          </div>
        )}

        {status === 'joining' && (
          <div className="py-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-base font-medium">Entrando na lista...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aguarde enquanto confirmamos seu acesso.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 text-center">
            <div className="text-green-500 text-5xl mb-3">✓</div>
            <p className="text-base font-medium">Você entrou na lista com sucesso.</p>
            <p className="text-sm text-muted-foreground mt-1">Redirecionando...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <div className="text-red-500 text-5xl mb-3">✕</div>
            <p className="text-base font-medium mb-2">Algo deu errado</p>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeToLists}>
                Voltar para minhas listas
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
