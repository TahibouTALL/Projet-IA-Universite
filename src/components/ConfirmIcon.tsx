"use client";
import type { ReactNode } from "react";

/** Petit bouton icône qui demande confirmation avant d'envoyer le formulaire. */
export function ConfirmIcon({ children, message, label }: { children: ReactNode; message: string; label: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      title="Supprimer"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger-soft hover:text-danger"
    >
      {children}
    </button>
  );
}
