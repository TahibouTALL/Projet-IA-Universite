import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n'existe pas ou tu n'y as pas accès.</p>
      <Link href="/dashboard" className="mt-6 text-accent hover:underline">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
