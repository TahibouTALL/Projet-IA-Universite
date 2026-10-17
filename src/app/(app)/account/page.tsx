import { KeyRound, UserRound } from "lucide-react";
import { requireUser, ROLE_LABELS } from "@/lib/access";
import { changePassword, updateName } from "@/app/actions/account";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Field, Input, PageHeader } from "@/components/ui";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Mon compte" />
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5">
          <Avatar name={user.name} size={52} />
          <div className="min-w-0">
            <p className="truncate text-[1.15rem] font-bold text-ink">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="mt-0.5 text-sm font-semibold text-accent">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
            <UserRound size={18} className="text-accent" aria-hidden />
            Nom affiché
          </h2>
          <ActionForm action={updateName} className="flex flex-col gap-3 sm:flex-row sm:items-end" reset={false}>
            <div className="flex-1">
              <Field label="Nom complet">
                <Input name="name" defaultValue={user.name} required />
              </Field>
            </div>
            <SubmitButton variant="secondary">Enregistrer</SubmitButton>
          </ActionForm>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
            <KeyRound size={18} className="text-accent" aria-hidden />
            Mot de passe
          </h2>
          <ActionForm action={changePassword} className="space-y-4">
            <Field label="Mot de passe actuel">
              <Input name="current" type="password" required autoComplete="current-password" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nouveau mot de passe" hint="8 caractères minimum">
                <Input name="next" type="password" required minLength={8} autoComplete="new-password" />
              </Field>
              <Field label="Confirmer">
                <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </Field>
            </div>
            <SubmitButton icon={<KeyRound />}>Changer le mot de passe</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
