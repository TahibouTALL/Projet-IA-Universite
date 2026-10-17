import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-6 text-center">
      <LogoMark size={44} />
      <h1 className="mt-5 text-[1.5rem] font-bold text-ink">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-md text-muted">Cette page n'existe pas, ou ton compte n'y a pas accès.</p>
      <Link href="/dashboard" className={`${button("primary")} mt-6`}>
        Retour à l'accueil
      </Link>
    </div>
  );
}
