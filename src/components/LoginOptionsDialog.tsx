import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, LogIn, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginOptionsDialog({ open, onOpenChange }: LoginOptionsDialogProps) {
  const { signInWithGoogle, signInWithOtp } = useAuth();

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const closeDialog = () => {
    onOpenChange(false);
    setShowEmailInput(false);
    setEmail('');
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error from dialog:', error);
      toast.error('Não foi possível iniciar login com Google.');
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setIsOtpLoading(true);
    try {
      await signInWithOtp(email);
      toast.success('Link de login enviado para seu email!', {
        id: 'login-link-sent-dialog',
        duration: 3000,
        closeButton: false,
      });
      closeDialog();
    } catch (error) {
      console.error('OTP login error from dialog:', error);
      toast.error('Erro ao enviar link de login.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Entrar na sua conta</DialogTitle>
          <DialogDescription>
            Você está como visitante. Escolha uma opção de login para vincular seus dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={isGoogleLoading || isOtpLoading}
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
                <Button
                  type="submit"
                  variant="secondary"
                  className="flex-1"
                  disabled={isOtpLoading}
                >
                  {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Enviar link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowEmailInput(false);
                    setEmail('');
                  }}
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
              disabled={isGoogleLoading || isOtpLoading}
            >
              <Mail className="h-4 w-4" />
              Entrar com Email
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
