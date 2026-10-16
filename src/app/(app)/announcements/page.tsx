import { asc, eq, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/access";
import { createAnnouncement, deleteAnnouncement, togglePin } from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Badge, btn, Card, cx, Empty, Field, formatDate, Input, PageHeader, Section, Select, Textarea } from "@/components/ui";

export const metadata = { title: "Annonces" };

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const list = await db.query.announcements.findMany({
    where: isAdmin
      ? undefined
      : user.classGroupId
        ? or(isNull(schema.announcements.classGroupId), eq(schema.announcements.classGroupId, user.classGroupId))
        : isNull(schema.announcements.classGroupId),
    with: { classGroup: true, author: { columns: { name: true } } },
    orderBy: (a, { desc }) => [desc(a.pinned), desc(a.createdAt)],
  });
  const classes = isAdmin ? await db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name)) : [];

  return (
    <>
      <PageHeader title="Annonces" subtitle="Informations de l'administration." />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {list.length ? (
            list.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {a.pinned && <Badge tone="accent">Épinglée</Badge>}
                  <Badge>{a.classGroup?.name ?? "Toute l'école"}</Badge>
                  <span className="text-xs text-faint">
                    {a.author.name} · {formatDate(a.createdAt, true)}
                  </span>
                </div>
                <h2 className="text-lg font-semibold">{a.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-muted">{a.body}</p>
                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <form action={togglePin}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className={cx(btn.ghost, "px-2 py-1 text-xs")}>{a.pinned ? "Désépingler" : "Épingler"}</button>
                    </form>
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message="Supprimer cette annonce ?">Supprimer</ConfirmButton>
                    </form>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <Empty>Aucune annonce.</Empty>
          )}
        </div>
        {isAdmin && (
          <div>
            <Section title="Nouvelle annonce">
              <Card className="p-5">
                <ActionForm action={createAnnouncement} className="space-y-3">
                  <Field label="Titre">
                    <Input name="title" required />
                  </Field>
                  <Field label="Message">
                    <Textarea name="body" required className="min-h-32" />
                  </Field>
                  <Field label="Destinataires">
                    <Select name="classGroupId" defaultValue="">
                      <option value="">Toute l'école</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="pinned" /> Épingler en haut
                  </label>
                  <SubmitButton>Publier</SubmitButton>
                </ActionForm>
              </Card>
            </Section>
          </div>
        )}
      </div>
    </>
  );
}
