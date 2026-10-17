"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Fine barre en haut de l'écran pendant le chargement d'une autre page (utile sur une connexion lente). */
export function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => setActive(false), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname) return;
      setActive(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Filet de sécurité si la navigation n'aboutit pas
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 10000);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;
  return (
    <div role="progressbar" aria-label="Chargement de la page" className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden bg-accent/15">
      <div className="nav-progress h-full w-1/3 rounded-full bg-accent" />
    </div>
  );
}
