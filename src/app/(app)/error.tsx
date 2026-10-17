"use client";
import { CircleAlert, RotateCcw } from "lucide-react";
import { button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <CircleAlert size={22} aria-hidden />
      </span>
      <h1 className="text-[1.35rem] font-bold text-ink">La page n'a pas pu s'afficher</h1>
      <p className="mt-2 text-md text-muted">{error.message || "Le serveur n'a pas répondu à temps."} Réessaie dans un instant.</p>
      <button onClick={reset} className={`${button("secondary")} mt-6`}>
        <RotateCcw size={16} aria-hidden />
        Réessayer
      </button>
    </div>
  );
}
