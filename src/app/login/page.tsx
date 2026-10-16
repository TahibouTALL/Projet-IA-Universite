import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <AuthFrame
      title="Connexion"
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Créer un compte étudiant
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
