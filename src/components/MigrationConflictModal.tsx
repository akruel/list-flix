import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface MigrationConflictModalProps {
  isOpen: boolean;
  onKeepLocal: () => void;
  onUseAccount: () => void;
}

export function MigrationConflictModal({ 
  isOpen, 
  onKeepLocal, 
  onUseAccount 
}: MigrationConflictModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Conflito de Dados</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Detectamos que você já possui dados salvos nesta conta, mas também tem dados locais (anônimos) neste dispositivo.
          </DialogDescription>
          <DialogDescription className="pt-2">
            Como você deseja prosseguir?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="rounded-md border p-4 bg-muted/50">
            <h4 className="font-medium mb-1">Manter dados locais</h4>
            <p className="text-sm text-muted-foreground">
              Seus dados locais serão mesclados com os dados da sua conta.
            </p>
          </div>
          
          <div className="rounded-md border p-4 bg-muted/50">
            <h4 className="font-medium mb-1">Usar dados da conta</h4>
            <p className="text-sm text-muted-foreground">
              Os dados locais deste dispositivo serão descartados e substituídos pelos dados da sua conta.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onUseAccount} className="w-full sm:w-auto">
            Usar dados da conta
          </Button>
          <Button onClick={onKeepLocal} className="w-full sm:w-auto">
            Manter dados locais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
