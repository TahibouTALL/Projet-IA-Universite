"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { btn, cx } from "./ui";

export type ActionResult = { error?: string; ok?: string } | null;
export type FormAction = (state: ActionResult, data: FormData) => Promise<ActionResult>;

export function SubmitButton({ children, variant = "primary", pendingText, className }: {
  children: ReactNode;
  variant?: keyof typeof btn;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cx(btn[variant], className)}>
      {pending ? pendingText ?? "Envoi..." : children}
    </button>
  );
}

/** Formulaire relié à une action serveur, avec message d'erreur ou de succès. */
export function ActionForm({ action, children, className, reset = true }: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  reset?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">{state.ok}</p>}
    </form>
  );
}

export function ConfirmButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className ?? cx(btn.ghost, "px-2 py-1 text-xs")}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
