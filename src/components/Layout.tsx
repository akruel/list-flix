import { Link, Outlet, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { CalendarDays, Home, List, Plus } from "lucide-react";
import { useState } from "react";

import { LoginButton } from "./LoginButton";
import { NotificationToggle } from "./NotificationToggle";
import { SearchModal } from "./SearchModal";

export function Layout() {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: CalendarDays, label: "Semana", path: "/this-week" },
    { icon: List, label: "Minhas Listas", path: "/lists" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            to="/"
            className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-2xl font-bold text-transparent"
          >
            ListFlix
          </Link>
          <nav className="hidden gap-6 md:flex">
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-2 transition-colors hover:text-primary",
                    isActive
                      ? "font-medium text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
            <button
              data-testid="search-open-button"
              onClick={() => setIsSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-500"
              title="Buscar"
            >
              <Plus size={18} />
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <NotificationToggle />
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "flex flex-col items-center gap-1 text-xs",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon size={24} />
                {item.label}
              </Link>
            );
          })}
          <button
            data-testid="search-open-button-mobile"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-500"
            title="Buscar"
          >
            <Plus size={22} />
          </button>
        </div>
      </nav>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
