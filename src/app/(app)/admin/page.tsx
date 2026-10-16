import { asc, count, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole, ROLE_LABELS } from "@/lib/access";
import { aiIsSimulated, aiModel, aiProvider } from "@/lib/ai/provider";
import { createClass, createUser, deleteClass, deleteUser, updateUser } from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Badge, btn, Card, cx, Field, Input, PageHeader, Section, Select } from "@/components/ui";

export const metadata = { title: "Administration" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireRole("ADMIN");
  const { q } = await searchParams;
  const classes = await db
    .select({ id: schema.classGroups.id, name: schema.classGroups.name, level: schema.classGroups.level, students: count(schema.users.id) })
    .from(schema.classGroups)
    .leftJoin(schema.users, eq(schema.users.classGroupId, schema.classGroups.id))
    .groupBy(schema.classGroups.id)
    .orderBy(asc(schema.classGroups.name));
  const users = await db.query.users.findMany({
    where: q ? or(ilike(schema.users.name, `%${q}%`), ilike(schema.users.email, `%${q}%`)) : undefined,
    orderBy: (u, { asc }) => [asc(u.role), asc(u.name)],
    limit: 200,
  });

  return (
    <>
      <PageHeader title="Administration" subtitle="Comptes, rôles, classes et configuration." />

      <Card className="mb-10 flex flex-wrap items-center gap-3 p-4 text-sm">
        <span className="font-medium">Assistant IA :</span>
        {aiIsSimulated ? (
          <>
            <Badge tone="warn">Mode simulation</Badge>
            <span className="text-muted">Renseigne AI_PROVIDER et AI_API_KEY dans le fichier .env pour activer une vraie IA.</span>
          </>
        ) : (
          <>
            <Badge tone="accent">{aiProvider}</Badge>
            <span className="text-muted">modèle {aiModel}</span>
          </>
        )}
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title={`Utilisateurs (${users.length})`}
            aside={
              <form className="flex gap-2">
                <Input name="q" defaultValue={q} placeholder="Rechercher..." className="w-48 py-1.5" />
              </form>
            }
          >
            <Card className="divide-y divide-line">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </div>
                  <form action={updateUser} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <Select name="role" defaultValue={u.role} className="w-auto py-1.5" disabled={u.id === admin.id}>
                      {Object.entries(ROLE_LABELS).map(([r, l]) => (
                        <option key={r} value={r}>
                          {l}
                        </option>
                      ))}
                    </Select>
                    {u.id === admin.id && <input type="hidden" name="role" value="ADMIN" />}
                    <Select name="classGroupId" defaultValue={u.classGroupId ?? ""} className="w-auto py-1.5">
                      <option value="">Sans classe</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <button className={cx(btn.secondary, "px-3 py-1.5")}>Enregistrer</button>
                  </form>
                  {u.id !== admin.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <ConfirmButton message={`Supprimer le compte de ${u.name} ? Ses documents et publications seront supprimés, ainsi que les cours dont il est le seul enseignant.`}>
                        Supprimer
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              ))}
            </Card>
          </Section>
        </div>

        <div>
          <Section title="Créer un compte">
            <Card className="p-5">
              <ActionForm action={createUser} className="space-y-3">
                <Field label="Nom complet">
                  <Input name="name" required />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" required />
                </Field>
                <Field label="Mot de passe provisoire">
                  <Input name="password" required minLength={8} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rôle">
                    <Select name="role" defaultValue="TEACHER">
                      {Object.entries(ROLE_LABELS).map(([r, l]) => (
                        <option key={r} value={r}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Classe">
                    <Select name="classGroupId" defaultValue="">
                      <option value="">Aucune</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <SubmitButton>Créer le compte</SubmitButton>
              </ActionForm>
            </Card>
          </Section>

          <Section title="Classes">
            <Card className="mb-4 divide-y divide-line">
              {classes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted">
                      {[c.level, `${c.students} membre(s)`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <form action={deleteClass}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message={`Supprimer la classe ${c.name} ? Ses cours, son emploi du temps et ses documents seront supprimés.`}>
                      Supprimer
                    </ConfirmButton>
                  </form>
                </div>
              ))}
              {!classes.length && <div className="px-4 py-3 text-sm text-muted">Aucune classe.</div>}
            </Card>
            <Card className="p-5">
              <ActionForm action={createClass} className="space-y-3">
                <Field label="Nom de la classe">
                  <Input name="name" required placeholder="DIC1 Génie industriel" />
                </Field>
                <Field label="Niveau" hint="(facultatif)">
                  <Input name="level" placeholder="Bac+3" />
                </Field>
                <SubmitButton variant="secondary">Ajouter la classe</SubmitButton>
              </ActionForm>
            </Card>
          </Section>
        </div>
      </div>
    </>
  );
}
