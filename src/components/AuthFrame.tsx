import { APP_NAME } from "@/lib/appname";
import type { ReactNode } from "react";

export function AuthFrame({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-accent-strong p-12 text-white lg:flex">
        <div className="text-lg font-semibold">{APP_NAME}</div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-snug">
            Les cours, les documents et l'emploi du temps de l'école, au même endroit.
          </p>
          <p className="mt-4 text-white/75">
            Avec un assistant IA qui s'appuie sur les vrais documents de l'établissement pour expliquer, résumer et entraîner.
          </p>
        </div>
        <div className="text-sm text-white/60">Enseignants · Étudiants · Administration · Ambassadeurs</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-lg font-semibold text-accent lg:hidden">{APP_NAME}</div>
          <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
          {children}
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
