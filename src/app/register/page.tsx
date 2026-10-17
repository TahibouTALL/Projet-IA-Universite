import Link from "next/link";
import { asc } from "drizzle-orm";
import { UserPlus } from "lucide-react";
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
      intro="Pour retrouver les cours et l'emploi du temps de ta classe."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-bold text-accent hover:underline">
            Se connecter
          </Link>
          <p className="mt-2 text-faint">Les comptes des enseignants et de l'administration sont créés par l'administration.</p>
        </>
      }
    >
      <ActionForm action={register} className="space-y-4" reset={false}>
        <Field label="Nom complet">
          <Input name="name" required autoComplete="name" placeholder="Prénom Nom" />
        </Field>
        <Field label="Email" hint={domain ? `adresse @${domain}` : undefined}>
          <Input name="email" type="email" required autoComplete="email" placeholder={domain ? `prenom.nom@${domain}` : "prenom.nom@ecole.sn"} />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Classe">
          <Select name="classGroupId" required defaultValue="">
            <option value="" disabled>
              {classes.length ? "Choisir ta classe" : "Aucune classe créée pour l'instant"}
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton icon={<UserPlus />} className="h-11 w-full" pendingText="Création...">
          Créer mon compte
        </SubmitButton>
      </ActionForm>
    </AuthFrame>
  );
}
