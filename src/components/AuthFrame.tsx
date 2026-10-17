import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/appname";
import { Wordmark } from "./Logo";

/** Pages de connexion et d'inscription : le tableau de l'école à gauche, le formulaire à droite. */
export function AuthFrame({ title, intro, children, footer }: { title: string; intro?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="board relative flex flex-col justify-between px-6 pb-8 pt-6 sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <Wordmark name={APP_NAME} light />
        <div className="mt-10 max-w-xl lg:mt-0">
          <p className="text-[1.75rem] font-bold leading-[1.15] tracking-[-0.015em] sm:text-[2.4rem] lg:text-[2.9rem]">
            Les cours, les documents et l'emploi du temps de l'école, au même endroit.
          </p>
          <ul className="mt-6 hidden space-y-2.5 text-md text-white/80 sm:block">
            <li className="flex gap-3">
              <span className="mt-2.5 h-1 w-4 shrink-0 rounded-full bg-chalk" />
              Ta journée en un coup d'œil : le prochain cours, la salle, l'enseignant.
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1 w-4 shrink-0 rounded-full bg-chalk" />
              Les supports et devoirs de chaque matière, rangés et téléchargeables.
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1 w-4 shrink-0 rounded-full bg-chalk" />
              Un assistant qui explique les cours en s'appuyant sur les documents de l'école.
            </li>
          </ul>
        </div>
        <p className="mt-10 hidden text-sm text-white/55 lg:block">Pour les étudiants, les enseignants et l'administration.</p>
      </aside>
      <main className="flex justify-center px-6 py-10 sm:px-10 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.015em] text-ink">{title}</h1>
          {intro && <p className="mt-1.5 text-md text-muted">{intro}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
