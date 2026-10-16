"use client";
import { btn } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "Réessaie dans un instant."}</p>
      <button onClick={reset} className={`${btn.secondary} mt-6`}>
        Réessayer
      </button>
    </div>
  );
}
