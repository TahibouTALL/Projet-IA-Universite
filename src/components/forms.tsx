"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { button, cx } from "./ui";

export type ActionResult = { error?: string; ok?: string } | null;
export type FormAction = (state: ActionResult, data: FormData) => Promise<ActionResult>;

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  pendingText,
  icon,
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  pendingText?: string;
  /** icône déjà rendue, par exemple <Upload /> (une fonction ne peut pas traverser vers le navigateur) */
  icon?: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cx(button(variant, size), className)}>
      {pending ? (
        <LoaderCircle size={17} className="animate-spin" aria-hidden />
      ) : (
        icon && (
          <span aria-hidden className="flex [&>svg]:h-[17px] [&>svg]:w-[17px] [&>svg]:stroke-[2.25]">
            {icon}
          </span>
        )
      )}
      {pending ? pendingText ?? "Envoi..." : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (!state?.error && !state?.ok) return null;
  const error = !!state.error;
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cx(
        "mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
        error ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-strong",
      )}
    >
      <Icon size={17} className="mt-px shrink-0" aria-hidden />
      <span>{state.error ?? state.ok}</span>
    </p>
  );
}

/** Formulaire relié à une action serveur, avec message d'erreur ou de succès. */
export function ActionForm({
  action,
  children,
  className,
  reset = true,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  reset?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) {
      ref.current?.reset();
      ref.current?.dispatchEvent(new Event("reset-files", { bubbles: true }));
    }
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function ConfirmButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className ?? cx(button("ghost", "sm"), "px-2 text-faint hover:text-danger")}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
