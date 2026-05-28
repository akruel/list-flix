import { Link, Outlet, useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { Bell, CalendarDays, Home, List, Plus } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  SearchModalProvider,
  useSearchModal,
} from "@/contexts/SearchModalContext";

import { LoginButton } from "./LoginButton";
import { NotificationToggle } from "./NotificationToggle";
import { SearchModal } from "./SearchModal";

function LayoutContent() {
  const location = useLocation();
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useSearchModal();
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    if (previousPathname.current === location.pathname) {
      return;
    }

    previousPathname.current = location.pathname;
    closeSearch();
  }, [closeSearch, location.pathname]);

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: CalendarDays, label: "Semana", path: "/this-week" },
    { icon: List, label: "Minhas Listas", path: "/lists" },
    { icon: Bell, label: "Atividades", path: "/activity" },
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
          <nav className="hidden items-center gap-6 md:flex">
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
          </nav>
          <div className="flex items-center gap-2">
            <NotificationToggle />
            <LoginButton />
          </div>
        </div>
      </header>

      <button
        type="button"
        data-testid="search-open-button"
        onClick={openSearch}
        aria-label="Buscar"
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-colors hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:flex"
      >
        <Plus size={24} />
      </button>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {navItems.slice(0, 2).map((item) => {
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
            type="button"
            data-testid="search-open-button-mobile"
            onClick={openSearch}
            aria-label="Buscar"
            className="flex h-11 w-11 items-center justify-center justify-self-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus size={22} />
          </button>
          {navItems.slice(2).map((item) => {
            const isActive =
              location.pathname === item.path ||
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
        </div>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </div>
  );
}

export function Layout() {
  return (
    <SearchModalProvider>
      <LayoutContent />
    </SearchModalProvider>
  );
}
