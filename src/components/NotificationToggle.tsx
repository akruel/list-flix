import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { usePushNotification } from "@/hooks/usePushNotification";

export function NotificationToggle() {
  const { status } = useAuth();
  const {
    isSupported,
    swReady,
    isSubscribed,
    isSubscribing,
    isUnsubscribing,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const isLoggedIn = status === "authenticated" || status === "anonymous";

  if (!isSupported || !swReady || !isLoggedIn) return null;

  const handleClick = async () => {
    if (isSubscribed) {
      try {
        await unsubscribe();
        toast.success("Notificações desativadas");
      } catch {
        toast.error("Erro ao desativar notificações");
      }
    } else {
      try {
        await subscribe();
        toast.success("Notificações ativadas!");
      } catch (error) {
        if (error instanceof Error && error.message === "Permission denied") {
          toast.error(
            "Permissão negada. Verifique as configurações do navegador.",
          );
        } else {
          toast.error("Erro ao ativar notificações");
        }
      }
    }
  };

  const isBusy = isSubscribing || isUnsubscribing;

  return (
    <button
      onClick={handleClick}
      disabled={isBusy}
      className="flex items-center rounded-md p-2 text-muted-foreground transition-colors hover:text-primary"
      title={isSubscribed ? "Desativar notificações" : "Ativar notificações"}
      aria-label={
        isSubscribed ? "Desativar notificações" : "Ativar notificações"
      }
    >
      {isBusy ? (
        <Loader2 size={20} className="animate-spin" />
      ) : isSubscribed ? (
        <BellOff size={20} />
      ) : (
        <Bell size={20} />
      )}
    </button>
  );
}
