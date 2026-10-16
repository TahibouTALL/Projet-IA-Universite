import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { AuthFrame } from "@/components/AuthFrame";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";
import { register } from "../actions/auth";

export const metadata = { title: "Créer un compte" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const classes = await db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name));
  const domain = process.env.ALLOWED_EMAIL_DOMAIN;
  return (
    <AuthFrame
      title="Créer un compte étudiant"
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Se connecter
          </Link>
          <p className="mt-3 text-xs text-faint">Les comptes enseignants et administration sont créés par l'administration.</p>
        </>
      }
    >
      <ActionForm action={register} className="space-y-4" reset={false}>
        <Field label="Nom complet">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Email" hint={domain ? `(@${domain})` : undefined}>
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Mot de passe" hint="(8 caractères minimum)">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Classe">
          <Select name="classGroupId" required defaultValue="">
            <option value="" disabled>
              {classes.length ? "Choisir..." : "Aucune classe créée pour l'instant"}
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton className="w-full" pendingText="Création...">
          Créer mon compte
        </SubmitButton>
      </ActionForm>
    </AuthFrame>
  );
}
