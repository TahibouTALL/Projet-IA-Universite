import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <AuthFrame
      title="Connexion"
      intro="Avec l'email de ton compte."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-bold text-accent hover:underline">
            Créer un compte étudiant
          </Link>
          <p className="mt-2 text-faint">Les comptes des enseignants sont créés par l'administration.</p>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
