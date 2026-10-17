"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, LogIn } from "lucide-react";
import { button, cx, Field, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });
    if (res?.error) {
      setPending(false);
      return setError("Email ou mot de passe incorrect.");
    }
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {params.get("registered") && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent-strong">
          <CircleCheck size={17} className="mt-px shrink-0" aria-hidden />
          Compte créé. Tu peux te connecter.
        </p>
      )}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required placeholder="prenom.nom@ecole.sn" />
      </Field>
      <Field label="Mot de passe">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
          <CircleAlert size={17} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cx(button("primary"), "h-11 w-full")}>
        {pending ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <LogIn size={17} aria-hidden />}
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
