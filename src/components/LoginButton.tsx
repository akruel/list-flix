import { useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "../contexts/AuthContext";
import { LoginOptionsDialog } from "./LoginOptionsDialog";
import { UserMenu } from "./UserMenu";

export function LoginButton() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [isLoginOptionsOpen, setIsLoginOptionsOpen] = useState(false);

  if (status === "loading") {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  if (status === "authenticated" && user) {
    return <UserMenu user={user} />;
  }

  return (
    <>
      <Button
        onClick={() => {
          if (status === "anonymous") {
            setIsLoginOptionsOpen(true);
            return;
          }
          navigate({ to: "/auth" });
        }}
        variant="secondary"
        className="rounded-full"
      >
        <LogIn className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Fazer Login</span>
      </Button>

      <LoginOptionsDialog
        open={isLoginOptionsOpen}
        onOpenChange={setIsLoginOptionsOpen}
      />
    </>
  );
}
