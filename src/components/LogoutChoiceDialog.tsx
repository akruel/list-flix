import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LogoutChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueAsGuest: () => void;
  onSignOutFully: () => void;
  isLoading?: boolean;
}

export function LogoutChoiceDialog({
  open,
  onOpenChange,
  onContinueAsGuest,
  onSignOutFully,
  isLoading = false,
}: LogoutChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Como você quer sair?</DialogTitle>
          <DialogDescription>
            Você pode continuar usando o app como visitante ou sair totalmente para a tela de autenticação.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onContinueAsGuest} disabled={isLoading}>
            Continuar como visitante
          </Button>
          <Button variant="destructive" onClick={onSignOutFully} disabled={isLoading}>
            Sair totalmente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
