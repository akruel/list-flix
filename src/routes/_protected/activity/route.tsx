import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_protected/activity")({
  component: ActivityRouteComponent,
});

function ActivityRouteComponent() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      data-testid="route-activity"
    >
      <Bell className="mb-4 h-12 w-12 text-gray-600" />
      <h1 className="mb-2 text-2xl font-bold text-white">Atividades</h1>
      <p className="max-w-sm text-gray-500">
        Em breve você poderá ver notificações e atividades aqui.
      </p>
    </div>
  );
}
