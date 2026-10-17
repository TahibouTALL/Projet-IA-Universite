"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  FileText,
  HeartHandshake,
  House,
  Library,
  LogOut,
  Megaphone,
  Menu,
  Settings2,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "./Logo";
import { NavProgress } from "./NavProgress";
import { Avatar, cx } from "./ui";

export type IconName = "home" | "courses" | "documents" | "schedule" | "announcements" | "ai" | "ambassador" | "knowledge" | "admin";
export type NavItem = { href: string; label: string; short?: string; icon: IconName; group?: "Contribuer" | "Gestion"; badge?: number };

const ICONS: Record<IconName, LucideIcon> = {
  home: House,
  courses: BookOpen,
  documents: FileText,
  schedule: CalendarDays,
  announcements: Megaphone,
  ai: Sparkles,
  ambassador: HeartHandshake,
  knowledge: Library,
  admin: Settings2,
};

// Onglets toujours visibles en bas de l'écran sur téléphone
const TABS = ["/dashboard", "/courses", "/documents", "/ai"];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export function Shell({
  appName,
  nav,
  user,
  children,
}: {
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

  const groups: { title?: string; items: NavItem[] }[] = [
    { items: nav.filter((n) => !n.group) },
    { title: "Contribuer", items: nav.filter((n) => n.group === "Contribuer") },
    { title: "Gestion", items: nav.filter((n) => n.group === "Gestion") },
  ].filter((g) => g.items.length);

  const links = (
    <nav aria-label="Navigation principale" className="flex flex-col gap-5">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1.5 px-3 text-xs font-bold text-faint">{g.title}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const on = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "flex h-11 items-center gap-3 rounded-[10px] px-3 text-md font-semibold transition-colors lg:h-10",
                      on ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-ink/[0.04] hover:text-ink",
                    )}
                  >
                    <Icon size={19} strokeWidth={on ? 2.25 : 1.9} className={on ? "text-accent" : "text-faint"} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && <span className="rounded-full bg-chalk px-1.5 text-xs font-bold text-ink">{item.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-ink">{user.name}</div>
        <div className="truncate text-xs text-faint">{[user.roleLabel, user.classLabel].filter(Boolean).join(", ")}</div>
      </div>
    </div>
  );
  const accountActions = (
    <div className="mt-2 flex flex-col gap-0.5">
      <Link href="/account" className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-ink/[0.04] hover:text-ink">
        <UserRound size={16} aria-hidden />
        Mon compte
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-left text-sm font-semibold text-muted hover:bg-ink/[0.04] hover:text-ink"
      >
        <LogOut size={16} aria-hidden />
        Se déconnecter
      </button>
    </div>
  );

  const tabs = TABS.map((href) => nav.find((n) => n.href === href)).filter((n): n is NavItem => !!n);

  return (
    <div className="min-h-screen lg:flex">
      <NavProgress />
      {/* Ordinateur : barre latérale */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/dashboard" className="mx-3 mt-5 mb-7 rounded-lg px-3 py-1">
          <Wordmark name={appName} />
        </Link>
        <div className="flex-1 overflow-y-auto px-3">{links}</div>
        <div className="border-t border-line p-4">
          {account}
          {accountActions}
        </div>
      </aside>

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="Accueil">
          <Wordmark name={appName} />
        </Link>
        <Link href="/account" aria-label="Mon compte" className="rounded-full">
          <Avatar name={user.name} size={32} />
        </Link>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-14 lg:pt-10">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>

      {/* Téléphone : onglets en bas, à portée de pouce */}
      <nav
        aria-label="Onglets"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => {
          const Icon = ICONS[t.icon];
          const on = isActive(pathname, t.href) && !open;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", on ? "text-accent-strong" : "text-faint")}
            >
              <span className={cx("flex h-7 w-14 items-center justify-center rounded-full transition-colors", on && "bg-accent-soft")}>
                <Icon size={20} strokeWidth={on ? 2.25 : 1.9} aria-hidden />
              </span>
              {t.short ?? t.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", open ? "text-accent-strong" : "text-faint")}
        >
          <span className={cx("flex h-7 w-14 items-center justify-center rounded-full transition-colors", open && "bg-accent-soft")}>
            {open ? <X size={20} strokeWidth={2.25} aria-hidden /> : <Menu size={20} strokeWidth={1.9} aria-hidden />}
          </span>
          {open ? "Fermer" : "Plus"}
        </button>
      </nav>

      {/* Téléphone : menu complet en panneau */}
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button aria-label="Fermer le menu" className="absolute inset-0 bg-board-deep/40" onClick={() => setOpen(false)} />
          <div
            className="sheet-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 shadow-[0_-8px_30px_rgb(18_51_43/0.18)]"
            style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
            <div className="mb-5 rounded-2xl bg-paper p-3">
              {account}
              {accountActions}
            </div>
            {links}
          </div>
        </div>
      )}
    </div>
  );
}
