import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MigrationConflictModalProps {
  isOpen: boolean;
  onKeepLocal: () => void;
  onUseAccount: () => void;
}

export function MigrationConflictModal({
  isOpen,
  onKeepLocal,
  onUseAccount,
}: MigrationConflictModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Conflito de Dados</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Detectamos que você já possui dados salvos nesta conta, mas também
            tem dados locais (anônimos) neste dispositivo.
          </DialogDescription>
          <DialogDescription className="pt-2">
            Como você deseja prosseguir?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div
            className="cursor-pointer rounded-md border bg-muted/50 p-4 hover:border-green-500"
            onClick={onKeepLocal}
            role="button"
            aria-pressed="false"
          >
            <h4 className="mb-1 font-medium">Manter dados locais</h4>
            <p className="text-sm text-muted-foreground">
              Seus dados locais serão mesclados com os dados da sua conta.
            </p>
          </div>

          <div
            className="cursor-pointer rounded-md border bg-muted/50 p-4 hover:border-green-500"
            onClick={onUseAccount}
            role="button"
            aria-pressed="false"
          >
            <h4 className="mb-1 font-medium">Usar dados da conta</h4>
            <p className="text-sm text-muted-foreground">
              Os dados locais deste dispositivo serão descartados e substituídos
              pelos dados da sua conta.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
