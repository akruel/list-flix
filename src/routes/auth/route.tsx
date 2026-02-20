import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { getPostLoginDestination } from '@/lib/postLoginNavigation'
import { authService } from '@/services/auth'

export const Route = createFileRoute('/auth')({
  component: AuthRouteComponent,
})

function AuthRouteComponent() {
  const { status, signInWithGoogle, signInWithOtp, continueAsGuest } = useAuth()
  const navigate = useNavigate()

  const [showEmailInput, setShowEmailInput] = useState(false)
  const [email, setEmail] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isOtpLoading, setIsOtpLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)

  useEffect(() => {
    if (status === 'anonymous' || status === 'authenticated') {
      const target = getPostLoginDestination(authService.consumePostLoginTarget())
      navigate({ ...target, replace: true })
    }
  }, [navigate, status])

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Google login error:', error)
      toast.error('Não foi possível iniciar login com Google.')
      setIsGoogleLoading(false)
    }
  }

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault()
    if (!email) return

    setIsOtpLoading(true)
    try {
      await signInWithOtp(email)
      toast.success('Link de login enviado para seu email!', {
        id: 'login-link-sent',
        duration: 3000,
        closeButton: false,
      })
      setShowEmailInput(false)
      setEmail('')
    } catch (error) {
      console.error('OTP login error:', error)
      toast.error('Erro ao enviar link de login.')
    } finally {
      setIsOtpLoading(false)
    }
  }

  const handleContinueAsGuest = async () => {
    setIsGuestLoading(true)
    try {
      await continueAsGuest()
      const target = getPostLoginDestination(authService.consumePostLoginTarget())
      navigate({ ...target, replace: true })
    } catch (error) {
      console.error('Guest sign-in error:', error)
      toast.error('Não foi possível continuar como visitante.')
      setIsGuestLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div data-testid="route-auth" className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Entrar no ListFlix</CardTitle>
          <CardDescription>
            Entre com Google, receba link por email ou continue como visitante.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={isGoogleLoading || isOtpLoading || isGuestLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            Continuar com Google
          </Button>

          {showEmailInput ? (
            <form onSubmit={handleSendOtp} className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  className="pl-9"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="secondary" className="flex-1" disabled={isOtpLoading}>
                  {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Enviar link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEmailInput(false)}
                  disabled={isOtpLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setShowEmailInput(true)}
              variant="outline"
              className="w-full"
              disabled={isGoogleLoading || isOtpLoading || isGuestLoading}
            >
              <Mail className="h-4 w-4" />
              Entrar com Email
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleContinueAsGuest}
            className="w-full"
            disabled={isGoogleLoading || isOtpLoading || isGuestLoading}
          >
            {isGuestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continuar como visitante
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
