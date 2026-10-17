import { asc, count, eq, ilike, or } from "drizzle-orm";
import { School, Search, Trash2, UserPlus } from "lucide-react";
import { db, schema } from "@/db";
import { requireRole, ROLE_LABELS } from "@/lib/access";
import { aiIsSimulated, aiModel, aiProvider } from "@/lib/ai/provider";
import { plural } from "@/lib/format";
import { createClass, createUser, deleteClass, deleteUser, updateUser } from "@/app/actions/admin";
import { ConfirmIcon } from "@/components/ConfirmIcon";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Badge, button, Disclosure, Empty, Field, Input, PageHeader, Select, Tabs } from "@/components/ui";

export const metadata = { title: "Administration" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const admin = await requireRole("ADMIN");
  const { q, tab = "comptes" } = await searchParams;
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
  const [{ n: userCount }] = await db.select({ n: count() }).from(schema.users);

  return (
    <>
      <PageHeader title="Administration" description="Les comptes, les classes et le réglage de l'assistant." />

      <Tabs
        active={tab}
        items={[
          { key: "comptes", label: "Comptes", href: "/admin", count: userCount },
          { key: "classes", label: "Classes", href: "/admin?tab=classes", count: classes.length },
          { key: "reglages", label: "Réglages", href: "/admin?tab=reglages" },
        ]}
      />

      {tab === "comptes" && (
        <div className="max-w-4xl">
          <Disclosure summary="Créer un compte" hint="Enseignant, administration ou ambassadeur" icon={UserPlus} className="mb-6">
            <ActionForm action={createUser} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom complet">
                  <Input name="name" required />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" required />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Mot de passe provisoire">
                  <Input name="password" required minLength={8} />
                </Field>
                <Field label="Rôle">
                  <Select name="role" defaultValue="TEACHER">
                    {Object.entries(ROLE_LABELS).map(([r, l]) => (
                      <option key={r} value={r}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Classe" hint="étudiants">
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
              <p className="text-sm text-muted">Communique le mot de passe provisoire à la personne : elle pourra le changer dans « Mon compte ».</p>
              <SubmitButton icon={<UserPlus />}>Créer le compte</SubmitButton>
            </ActionForm>
          </Disclosure>

          <form className="relative mb-4">
            <input type="hidden" name="tab" value="comptes" />
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
            <Input name="q" defaultValue={q} placeholder="Rechercher un nom ou un email" className="pl-9" aria-label="Rechercher un compte" />
          </form>

          {users.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5">
                  <div className="order-1 flex min-w-0 flex-1 basis-48 items-center gap-3">
                    <Avatar name={u.name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">
                        {u.name}
                        {u.id === admin.id && <span className="ml-2 text-xs font-semibold text-faint">(toi)</span>}
                      </p>
                      <p className="truncate text-[13px] text-muted">{u.email}</p>
                    </div>
                  </div>
                  <form action={updateUser} className="order-3 grid w-full grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-2 sm:order-2 sm:flex sm:w-auto sm:items-center">
                    <input type="hidden" name="id" value={u.id} />
                    <Select name="role" defaultValue={u.role} className="h-10 sm:h-9 sm:w-40" disabled={u.id === admin.id} aria-label={`Rôle de ${u.name}`}>
                      {Object.entries(ROLE_LABELS).map(([r, l]) => (
                        <option key={r} value={r}>
                          {l}
                        </option>
                      ))}
                    </Select>
                    {u.id === admin.id && <input type="hidden" name="role" value="ADMIN" />}
                    <Select name="classGroupId" defaultValue={u.classGroupId ?? ""} className="h-10 sm:h-9 sm:w-48" aria-label={`Classe de ${u.name}`}>
                      <option value="">Sans classe</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <button className={button("secondary", "sm") + " col-span-2 h-10 sm:h-9"}>Enregistrer</button>
                  </form>
                  {u.id !== admin.id ? (
                    <form action={deleteUser} className="order-2 sm:order-3">
                      <input type="hidden" name="id" value={u.id} />
                      <ConfirmIcon message={`Supprimer le compte de ${u.name} ? Ses cours, documents et publications seront supprimés.`} label={`Supprimer ${u.name}`}>
                        <Trash2 size={16} aria-hidden />
                      </ConfirmIcon>
                    </form>
                  ) : (
                    <span className="order-2 hidden w-9 sm:order-3 sm:block" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Search}>Aucun compte ne correspond à « {q} ».</Empty>
          )}
        </div>
      )}

      {tab === "classes" && (
        <div className="max-w-3xl">
          <Disclosure summary="Ajouter une classe" icon={School} className="mb-6" open={classes.length === 0}>
            <ActionForm action={createClass} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
              <Field label="Nom de la classe">
                <Input name="name" required placeholder="DIC1 Génie industriel" />
              </Field>
              <Field label="Niveau" hint="facultatif">
                <Input name="level" placeholder="Bac+3" />
              </Field>
              <SubmitButton icon={<School />}>Ajouter la classe</SubmitButton>
            </ActionForm>
          </Disclosure>
          {classes.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {classes.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <School size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{c.name}</p>
                    <p className="text-[13px] text-muted">
                      {[c.level, plural(c.students, "membre")].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <form action={deleteClass}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmIcon message={`Supprimer la classe ${c.name} ? Ses cours, son emploi du temps et ses documents seront supprimés.`} label={`Supprimer ${c.name}`}>
                      <Trash2 size={16} aria-hidden />
                    </ConfirmIcon>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={School} title="Aucune classe">
              Crée les classes (ou promotions) de l'établissement. Les étudiants choisissent la leur à l'inscription.
            </Empty>
          )}
        </div>
      )}

      {tab === "reglages" && (
        <div className="max-w-3xl space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-ink">Assistant IA</p>
              {aiIsSimulated ? <Badge tone="warn">Mode démonstration</Badge> : <Badge tone="accent">Actif</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted">
              {aiIsSimulated
                ? "Les réponses sont des exemples. Renseigne AI_PROVIDER et AI_API_KEY dans les variables d'environnement pour brancher un vrai service."
                : `Service ${aiProvider}, modèle ${aiModel}.`}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-bold text-ink">Inscriptions</p>
            <p className="mt-2 text-sm text-muted">
              {process.env.ALLOWED_EMAIL_DOMAIN
                ? `Seules les adresses @${process.env.ALLOWED_EMAIL_DOMAIN} peuvent créer un compte étudiant.`
                : "Toute adresse email peut créer un compte étudiant. Pour limiter aux adresses de l'école, renseigne ALLOWED_EMAIL_DOMAIN."}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-bold text-ink">Fichiers</p>
            <p className="mt-2 text-sm text-muted">
              {(process.env.STORAGE_DRIVER || "local") === "s3" ? "Stockage en ligne (compatible S3)." : "Stockage sur le disque du serveur."} Taille maximale par fichier :{" "}
              {process.env.MAX_UPLOAD_MB || 20} Mo.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
