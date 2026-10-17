import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { CalendarClock, CalendarDays, ChevronLeft, Clock, FileText, Megaphone, PenLine, Presentation, Sparkles, Trash2, Upload, Users } from "lucide-react";
import { db, schema } from "@/db";
import { canManageCourse, getViewableCourse, isStudentLike, requireUser } from "@/lib/access";
import { DAYS, dueLabel, formatSize, nextSlot, nowInDakar, relativeTime } from "@/lib/format";
import { createItem, deleteCourse, deleteItem } from "@/app/actions/courses";
import { ConfirmIcon } from "@/components/ConfirmIcon";
import { DocList, type DocRow } from "@/components/DocList";
import { FileDrop } from "@/components/FileDrop";
import { FileTile } from "@/components/FileTile";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Markdown } from "@/components/Markdown";
import { UploadForm } from "@/components/UploadForm";
import { Avatar, Badge, ButtonLink, Choice, Disclosure, Empty, Field, Input, Tabs, Textarea, cx } from "@/components/ui";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

const TYPE_LABEL = { LESSON: "Support", ASSIGNMENT: "Devoir", ANNOUNCEMENT: "Annonce" } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, (await params).id) });
  return { title: course?.title ?? "Cours" };
}

export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const course = await getViewableCourse(user, (await params).id);
  const manager = canManageCourse(user, course);
  const tab = (await searchParams).tab ?? "fil";

  const items = await db.query.courseItems.findMany({
    where: eq(schema.courseItems.courseId, course.id),
    with: { author: { columns: { name: true } }, documents: true },
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  // Documents hors publications (les documents réservés à l'IA ne s'affichent jamais ici)
  const docs = await db.query.documents.findMany({
    where: and(eq(schema.documents.courseId, course.id), eq(schema.documents.status, "PUBLISHED"), eq(schema.documents.aiOnly, false)),
    with: { uploader: { columns: { name: true } } },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });
  const slots = await db.query.scheduleEntries.findMany({
    where: eq(schema.scheduleEntries.courseId, course.id),
    orderBy: (e, { asc }) => [asc(e.dayOfWeek), asc(e.startTime)],
  });
  const now = nowInDakar();
  const upcoming = nextSlot(slots, now);
  const nowDate = new Date();
  const dueSoon = items
    .filter((i) => i.type === "ASSIGNMENT" && i.dueDate && i.dueDate.getTime() > nowDate.getTime() - 2 * 86400000)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 4);
  const loose = docs.filter((d) => !d.itemId);
  const toRow = (d: (typeof docs)[number]): DocRow => ({ ...d, uploaderName: d.uploader.name, canDelete: manager || d.uploaderId === user.id });
  const official = loose.filter((d) => d.source === "TEACHER" || d.source === "ADMIN");
  const shared = loose.filter((d) => d.source === "STUDENT");
  const base = `/courses/${course.id}`;

  return (
    <>
      <Link href="/courses" className="-ml-1 mb-3 hidden items-center gap-1 rounded-md px-1 text-sm font-semibold text-muted hover:text-ink sm:inline-flex">
        <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
        {user.role === "ADMIN" ? "Cours" : "Mes cours"}
      </Link>
      <section className="ruled -mx-4 -mt-6 mb-2 sm:mt-0 overflow-hidden text-white sm:mx-0 sm:rounded-3xl" style={{ backgroundColor: course.color }}>
        <div className="px-5 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-7">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {course.code && <span className="rounded-md bg-black/20 px-2 py-0.5 tracking-wide">{course.code}</span>}
            <span className="rounded-md bg-black/20 px-2 py-0.5">{course.classGroup.name}</span>
          </div>
          <h1 className="mt-3 max-w-3xl text-[1.85rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">{course.title}</h1>
          {course.description && <p className="mt-2 max-w-2xl text-md text-white/90">{course.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-white/95">
            <p className="flex items-center gap-2">
              <Avatar name={course.teacher.name} size={26} className="ring-2 ring-white/40" />
              {course.teacher.name}
            </p>
            {upcoming && (
              <p className="flex items-center gap-2">
                <CalendarClock size={17} className="shrink-0" aria-hidden />
                <span>
                  {upcoming.live ? "Séance " : "Prochaine séance : "}
                  {upcoming.when}
                  {upcoming.slot.room && `, ${upcoming.slot.room}`}
                </span>
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href={`/ai/chat?course=${course.id}`} variant="light" icon={Sparkles}>
              Réviser avec l'IA
            </ButtonLink>
            <ButtonLink href={`/ai/exercises?course=${course.id}`} variant="outlineLight" icon={PenLine}>
              S'entraîner
            </ButtonLink>
            {manager && (
              <ButtonLink href={`/ai/presentation?course=${course.id}`} variant="outlineLight" icon={Presentation}>
                Présentation
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      <Tabs
        active={tab}
        items={[
          { key: "fil", label: "Fil du cours", href: base, count: items.length },
          { key: "documents", label: "Documents", href: `${base}?tab=documents`, count: official.length },
          { key: "partages", label: "Partages", href: `${base}?tab=partages`, count: shared.length },
        ]}
      />

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start xl:gap-10">
        <div className="min-w-0">
          {tab === "fil" && (
            <div className="max-w-3xl">
              {manager && (
                <details className="group mb-6 rounded-2xl border border-line bg-white">
                  <summary className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 hover:bg-paper/60 sm:px-5">
                    <Avatar name={user.name} size={36} />
                    <span className="flex-1 text-md text-faint group-open:font-bold group-open:text-ink">
                      <span className="group-open:hidden">Publier pour la classe : un support, un devoir ou une annonce</span>
                      <span className="hidden group-open:inline">Nouvelle publication</span>
                    </span>
                  </summary>
                  <div className="border-t border-line px-4 py-5 sm:px-5">
                    <ActionForm action={createItem} className="space-y-4">
                      <input type="hidden" name="courseId" value={course.id} />
                      <Choice
                        name="type"
                        label="Type"
                        defaultValue="LESSON"
                        options={[
                          { value: "LESSON", label: "Support de cours" },
                          { value: "ASSIGNMENT", label: "Devoir" },
                          { value: "ANNOUNCEMENT", label: "Annonce" },
                        ]}
                      />
                      <Field label="Titre">
                        <Input name="title" required placeholder="Chapitre 2 : Flexion simple" />
                      </Field>
                      <Field label="Texte" hint="formules entre $...$ acceptées">
                        <Textarea name="content" className="min-h-28" placeholder="Consignes, résumé du chapitre, lien vers une ressource..." />
                      </Field>
                      <div>
                        <span className="mb-1.5 block text-sm font-bold text-ink">Pièces jointes</span>
                        <FileDrop name="files" multiple />
                      </div>
                      <Field label="Date limite" hint="pour un devoir">
                        <Input name="dueDate" type="datetime-local" className="sm:max-w-xs" />
                      </Field>
                      <SubmitButton icon={<PenLine />} pendingText="Publication...">
                        Publier
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </details>
              )}

              {items.length ? (
                <div className="space-y-4">
                  {items.map((i) => {
                    const due = i.dueDate ? dueLabel(i.dueDate) : null;
                    return (
                      <article key={i.id} id={i.id} className="scroll-mt-24 rounded-2xl border border-line bg-white">
                        <header className="flex items-center gap-3 px-4 pt-4 sm:px-5">
                          <Avatar name={i.author.name} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">{i.author.name}</p>
                            <p className="text-xs text-faint">{relativeTime(i.createdAt)}</p>
                          </div>
                          <Badge tone={i.type === "ASSIGNMENT" ? "warn" : i.type === "ANNOUNCEMENT" ? "accent" : "neutral"}>
                            {i.type === "ANNOUNCEMENT" && <Megaphone size={12} aria-hidden />}
                            {TYPE_LABEL[i.type]}
                          </Badge>
                          {manager && (
                            <form action={deleteItem}>
                              <input type="hidden" name="itemId" value={i.id} />
                              <ConfirmIcon message="Supprimer cette publication et ses pièces jointes ?" label={`Supprimer ${i.title}`}>
                                <Trash2 size={16} aria-hidden />
                              </ConfirmIcon>
                            </form>
                          )}
                        </header>
                        <div className="px-4 pb-5 pt-3 sm:px-5">
                          <h3 className="text-[1.15rem] font-bold leading-snug text-ink">{i.title}</h3>
                          {due && (
                            <p
                              className={cx(
                                "mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold",
                                due.tone === "danger"
                                  ? "bg-danger-soft text-danger"
                                  : due.tone === "warn"
                                    ? "bg-warn-soft text-warn"
                                    : "bg-ink/[0.05] text-muted",
                              )}
                            >
                              <Clock size={14} aria-hidden />À rendre {due.text}
                            </p>
                          )}
                          {i.content && (
                            <div className="mt-2">
                              <Markdown>{i.content}</Markdown>
                            </div>
                          )}
                          {i.documents.length > 0 && (
                            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                              {i.documents.map((d) => (
                                <li key={d.id}>
                                  <a
                                    href={`/api/files/${d.id}`}
                                    target="_blank"
                                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-paper/60"
                                  >
                                    <FileTile fileName={d.fileName} />
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-bold text-ink">{d.title}</span>
                                      <span className="block text-xs text-faint">{formatSize(d.size)}</span>
                                    </span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty icon={PenLine} title="Le fil du cours est vide">
                  {manager
                    ? "Publie un premier support, un devoir ou une annonce avec la zone ci-dessus."
                    : "Les supports, devoirs et annonces de ton enseignant apparaîtront ici."}
                </Empty>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div className="max-w-3xl">
              {manager && (
                <Disclosure summary="Ajouter un document au cours" icon={Upload} className="mb-6" open={official.length === 0}>
                  <UploadForm fixedCourseId={course.id} submitLabel="Ajouter au cours" />
                </Disclosure>
              )}
              {official.length ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <DocList docs={official.map(toRow)} />
                </div>
              ) : (
                !manager && (
                  <Empty icon={FileText} title="Pas encore de document">
                    Les polycopiés, TD et sujets déposés par ton enseignant apparaîtront ici.
                  </Empty>
                )
              )}
            </div>
          )}

          {tab === "partages" && (
            <div className="max-w-3xl">
              <p className="mb-5 text-md text-muted">Fiches de révision, notes et documents partagés entre étudiants de la classe.</p>
              {(isStudentLike(user) || manager) && (
                <Disclosure summary="Partager un document avec la classe" icon={Users} className="mb-6" open={shared.length === 0 && isStudentLike(user)}>
                  <UploadForm fixedCourseId={course.id} submitLabel="Partager" defaultKind="SUMMARY" />
                </Disclosure>
              )}
              {shared.length ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <DocList docs={shared.map(toRow)} />
                </div>
              ) : (
                !isStudentLike(user) && (
                  <Empty icon={Users} title="Aucun partage pour l'instant">
                    Les documents partagés par les étudiants apparaîtront ici.
                  </Empty>
                )
              )}
            </div>
          )}
        </div>

        {/* Colonne de repères sur grand écran : ce qui est à rendre et quand le cours a lieu */}
        <aside className="hidden space-y-4 xl:sticky xl:top-8 xl:block" aria-label="Repères du cours">
          <section className="rounded-2xl border border-line bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <Clock size={15} className="text-faint" aria-hidden />
              {manager ? "Devoirs en cours" : "À rendre"}
            </h2>
            {dueSoon.length ? (
              <ul className="space-y-3">
                {dueSoon.map((i) => {
                  const due = dueLabel(i.dueDate!);
                  return (
                    <li key={i.id}>
                      <Link href={`${base}#${i.id}`} className="group block">
                        <span className="block text-sm font-bold leading-snug text-ink group-hover:text-accent">{i.title}</span>
                        <span
                          className={cx(
                            "mt-0.5 block text-xs font-bold",
                            due.tone === "danger" ? "text-danger" : due.tone === "warn" ? "text-warn" : "text-muted",
                          )}
                        >
                          {due.text}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">{manager ? "Aucun devoir avec une date limite." : "Rien à rendre pour l'instant."}</p>
            )}
          </section>

          {slots.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                <CalendarDays size={15} className="text-faint" aria-hidden />
                Séances de la semaine
              </h2>
              <ul className="space-y-1">
                {slots.map((s) => {
                  const on = upcoming?.slot.id === s.id;
                  return (
                    <li key={s.id} className={cx("-mx-2 rounded-lg px-2 py-1.5", on && "bg-accent-soft")}>
                      <p className="flex items-baseline justify-between gap-3 text-sm">
                        <span className={cx("font-bold", on ? "text-accent-strong" : "text-ink")}>{DAYS[s.dayOfWeek]}</span>
                        <span className="tabular text-muted">
                          {s.startTime} à {s.endTime}
                        </span>
                      </p>
                      {(s.room || on) && (
                        <p className="flex items-center justify-between gap-3 text-xs text-faint">
                          <span className="truncate">{s.room}</span>
                          {on && <span className="shrink-0 font-bold text-accent-strong">{upcoming!.live ? "En cours" : "Prochaine"}</span>}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Link href="/schedule" className="mt-3 inline-flex text-sm font-bold text-accent hover:underline">
                Voir l'emploi du temps
              </Link>
            </section>
          )}
        </aside>
      </div>

      {manager && (
        <form action={deleteCourse} className="mt-14 border-t border-line pt-5">
          <input type="hidden" name="courseId" value={course.id} />
          <ConfirmButton
            message="Supprimer définitivement ce cours, ses publications et ses documents ?"
            className="inline-flex items-center gap-2 text-sm font-bold text-danger hover:underline"
          >
            <Trash2 size={15} aria-hidden />
            Supprimer le cours
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
