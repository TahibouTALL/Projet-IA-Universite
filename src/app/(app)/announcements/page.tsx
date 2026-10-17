import { asc, eq, isNull, or } from "drizzle-orm";
import { Megaphone, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/access";
import { relativeTime } from "@/lib/format";
import { createAnnouncement, deleteAnnouncement, togglePin } from "@/app/actions/admin";
import { ConfirmIcon } from "@/components/ConfirmIcon";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, Badge, Disclosure, Empty, Field, Input, PageHeader, Select, Textarea, cx } from "@/components/ui";

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
      <PageHeader title="Annonces" description="Les informations de l'administration pour toute l'école ou pour ta classe." />

      <div className="max-w-3xl">
        {isAdmin && (
          <Disclosure summary="Écrire une annonce" hint="Pour toute l'école ou une seule classe" icon={Megaphone} className="mb-8">
            <ActionForm action={createAnnouncement} className="space-y-4">
              <Field label="Titre">
                <Input name="title" required placeholder="Examens de mi-semestre" />
              </Field>
              <Field label="Message">
                <Textarea name="body" required className="min-h-32" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm font-semibold text-ink">
                  <input type="checkbox" name="pinned" className="h-4 w-4 accent-[var(--color-accent)]" />
                  Épingler en haut de la liste
                </label>
              </div>
              <SubmitButton icon={<Send />}>Publier</SubmitButton>
            </ActionForm>
          </Disclosure>
        )}

        {list.length ? (
          <ul className="space-y-4">
            {list.map((a) => (
              <li key={a.id} className={cx("rounded-2xl border border-line bg-white", a.pinned && "border-l-4 border-l-chalk")}>
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && (
                      <Badge tone="chalk">
                        <Pin size={12} aria-hidden />
                        Épinglée
                      </Badge>
                    )}
                    <Badge>{a.classGroup?.name ?? "Toute l'école"}</Badge>
                  </div>
                  <h2 className="mt-2.5 text-[1.15rem] font-bold leading-snug text-ink">{a.title}</h2>
                  <p className="mt-1.5 whitespace-pre-line text-md leading-relaxed text-muted">{a.body}</p>
                  <div className="mt-4 flex items-center gap-2.5">
                    <Avatar name={a.author.name} size={24} />
                    <p className="flex-1 text-[13px] text-faint">
                      {a.author.name}, {relativeTime(a.createdAt)}
                    </p>
                    {isAdmin && (
                      <div className="flex items-center">
                        <form action={togglePin}>
                          <input type="hidden" name="id" value={a.id} />
                          <button
                            aria-label={a.pinned ? "Désépingler" : "Épingler"}
                            title={a.pinned ? "Désépingler" : "Épingler"}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-faint hover:bg-ink/[0.05] hover:text-ink"
                          >
                            {a.pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
                          </button>
                        </form>
                        <form action={deleteAnnouncement}>
                          <input type="hidden" name="id" value={a.id} />
                          <ConfirmIcon message="Supprimer cette annonce ?" label={`Supprimer ${a.title}`}>
                            <Trash2 size={16} aria-hidden />
                          </ConfirmIcon>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={Megaphone} title="Aucune annonce">
            {isAdmin ? "Écris une première annonce avec le formulaire ci-dessus." : "Les annonces de l'administration apparaîtront ici."}
          </Empty>
        )}
      </div>
    </>
  );
}
