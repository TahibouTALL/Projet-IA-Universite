import { requireUser, ROLE_LABELS } from "@/lib/access";
import { changePassword, updateName } from "@/app/actions/account";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Mon compte" subtitle={`${user.email} · ${ROLE_LABELS[user.role]}`} />
      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        <Section title="Nom affiché">
          <Card className="p-5">
            <ActionForm action={updateName} className="space-y-3" reset={false}>
              <Field label="Nom complet">
                <Input name="name" defaultValue={user.name} required />
              </Field>
              <SubmitButton variant="secondary">Enregistrer</SubmitButton>
            </ActionForm>
          </Card>
        </Section>
        <Section title="Mot de passe">
          <Card className="p-5">
            <ActionForm action={changePassword} className="space-y-3">
              <Field label="Mot de passe actuel">
                <Input name="current" type="password" required autoComplete="current-password" />
              </Field>
              <Field label="Nouveau mot de passe" hint="(8 caractères minimum)">
                <Input name="next" type="password" required minLength={8} autoComplete="new-password" />
              </Field>
              <Field label="Confirmer le nouveau mot de passe">
                <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </Field>
              <SubmitButton>Changer le mot de passe</SubmitButton>
            </ActionForm>
          </Card>
        </Section>
      </div>
    </>
  );
}
