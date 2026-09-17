"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { errorMessage, isUnauthenticated, setUnauthorizedListener } from "@/lib/api";
import { getCurrentUser, logout as logoutRequest } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ErrorState, ScreenLoading, Spinner } from "@/components/ui/feedback";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notas", label: "Notas", icon: BookOpen },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const navId = useId();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [desktop, setDesktop] = useState(true);

  useEffect(() => {
    setUnauthorizedListener(() => {
      router.replace("/login");
    });

    return () => {
      setUnauthorizedListener(null);
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
          setLoading(false);
        }
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }

        if (isUnauthenticated(caught)) {
          return;
        }

        setError(errorMessage(caught));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const logout = useCallback(async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logoutRequest();
    } catch {
      // Always return to login so a stale shell is not kept on screen.
    }

    router.replace("/login");
  }, [loggingOut, router]);

  if (loading || (!user && !error)) {
    return <ScreenLoading />;
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md">
          <ErrorState
            message={error ?? "Não foi possível validar a sessão."}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        </div>
      </div>
    );
  }

  const pageTitle = pathname.startsWith("/notas") ? "Notas" : "Dashboard";

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id={navId}
        inert={!desktop && !mobileOpen ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-background px-3 py-4 transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-2 pb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">FIAP</p>
            <p className="mt-1 text-sm font-semibold tracking-tight">Central Acadêmica</p>
          </div>
          <button
            type="button"
            className={cn(
              "rounded-md p-1 text-muted hover:bg-surface-hover hover:text-foreground md:hidden",
              !mobileOpen && "hidden",
            )}
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav aria-label="Principal" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface text-foreground"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-4 w-4", active ? "text-accent" : "text-muted")}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              aria-controls={navId}
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>
            <h1 className="text-sm font-medium">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="mt-1 text-xs text-muted">{user.ra ?? user.email}</p>
            </div>
            <Button
              variant="ghost"
              className="px-2"
              onClick={() => void logout()}
              disabled={loggingOut}
              aria-label="Sair"
            >
              {loggingOut ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              )}
              <span className="hidden sm:inline">{loggingOut ? "Saindo..." : "Sair"}</span>
            </Button>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
