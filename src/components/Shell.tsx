"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { cx } from "./ui";

export type NavItem = { href: string; label: string; badge?: number };

export function Shell({ appName, nav, user, children }: {
  appName: string;
  nav: NavItem[];
  user: { name: string; roleLabel: string; classLabel?: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) || pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cx(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:bg-stone-100 hover:text-ink",
            )}
          >
            {item.label}
            {!!item.badge && (
              <span className="rounded-full bg-warn px-1.5 text-xs font-semibold text-white">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-line pt-4">
      <div className="truncate text-sm font-medium">{user.name}</div>
      <div className="truncate text-xs text-faint">
        {user.roleLabel}
        {user.classLabel ? ` · ${user.classLabel}` : ""}
      </div>
      <div className="mt-3 flex gap-4 text-xs">
        <Link href="/account" onClick={() => setOpen(false)} className="text-muted hover:text-ink">
          Mon compte
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-muted hover:text-ink">
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-line bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div>
          <Link href="/dashboard" className="mb-8 block px-3 text-lg font-semibold text-accent">
            {appName}
          </Link>
          {links}
        </div>
        {account}
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="font-semibold text-accent">
          {appName}
        </Link>
        <button onClick={() => setOpen(!open)} className="rounded-lg border border-line px-3 py-1.5 text-sm" aria-expanded={open}>
          {open ? "Fermer" : "Menu"}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[53px] z-10 space-y-4 border-b border-line bg-white p-4 shadow-lg lg:hidden">
          {links}
          {account}
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
