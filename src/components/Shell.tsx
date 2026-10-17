"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "./ui";

export type NavItem = { href: string; label: string; short?: string; badge?: number };

// Onglets toujours visibles en bas de l'écran sur téléphone
const TABS = ["/dashboard", "/courses", "/ai", "/schedule"];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export function Shell({ appName, nav, user, children }: {
  appName: string;
  nav: NavItem[];
  user: { name: string; roleLabel: string; classLabel?: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fermer le menu à chaque changement de page et bloquer le défilement derrière lui
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cx(
            "flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] transition lg:py-2 lg:text-sm",
            isActive(pathname, item.href) ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:bg-stone-100 hover:text-ink",
          )}
        >
          {item.label}
          {!!item.badge && <span className="rounded-full bg-warn px-1.5 text-xs font-semibold text-white">{item.badge}</span>}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-line pt-4">
      <div className="truncate text-sm font-medium">{user.name}</div>
      <div className="truncate text-xs text-faint">
        {user.roleLabel}
        {user.classLabel ? ` · ${user.classLabel}` : ""}
      </div>
      <div className="mt-3 flex gap-5 text-sm lg:text-xs">
        <Link href="/account" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
          Mon compte
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-muted hover:text-ink">
          Se déconnecter
        </button>
      </div>
    </div>
  );

  const tabs = TABS.map((href) => nav.find((n) => n.href === href)).filter((n): n is NavItem => !!n);

  return (
    <div className="min-h-screen lg:flex">
      {/* Ordinateur : barre latérale */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-line bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div>
          <Link href="/dashboard" className="mb-8 block px-3 text-lg font-semibold text-accent">
            {appName}
          </Link>
          {links}
        </div>
        {account}
      </aside>

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="font-semibold text-accent">
          {appName}
        </Link>
        <span className="max-w-[55%] truncate text-xs text-faint">{user.name}</span>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Téléphone : onglets en bas, à portée de pouce */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cx(
              "flex h-14 flex-col items-center justify-center gap-1 text-[11px]",
              isActive(pathname, t.href) && !open ? "font-semibold text-accent" : "text-muted",
            )}
          >
            <span className={cx("h-1 w-6 rounded-full", isActive(pathname, t.href) && !open ? "bg-accent" : "bg-transparent")} />
            {t.short ?? t.label}
          </Link>
        ))}
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cx("flex h-14 flex-col items-center justify-center gap-1 text-[11px]", open ? "font-semibold text-accent" : "text-muted")}
        >
          <span className={cx("h-1 w-6 rounded-full", open ? "bg-accent" : "bg-transparent")} />
          {open ? "Fermer" : "Plus"}
        </button>
      </nav>

      {/* Téléphone : menu complet en panneau */}
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button aria-label="Fermer le menu" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-24 shadow-2xl"
            style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-200" />
            {links}
            <div className="mt-4">{account}</div>
          </div>
        </div>
      )}
    </div>
  );
}
