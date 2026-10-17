import Link from "next/link";
import { and, count, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { ArrowUp, BookOpen, Check, FilePlus2, Megaphone, PenLine, Pin, Presentation, Sparkles } from "lucide-react";
import { db, schema } from "@/db";
import { isStudentLike, requireUser, visibleCourses } from "@/lib/access";
import { dueLabel, formatLongDate, nowInDakar, plural, relativeTime } from "@/lib/format";
import { courseCounts } from "@/lib/stats";
import { TodayBoard } from "@/components/TodayBoard";
import { Badge, ButtonLink, CourseDot, Empty, PageHeader, Panel, Section, cx } from "@/components/ui";

export const metadata = { title: "Accueil" };

export default async function Dashboard() {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  const courseIds = courses.map((c) => c.id);
  const now = nowInDakar();
  const learner = isStudentLike(user);
  const firstName = user.name.split(" ")[0];
  const longDate = formatLongDate(new Date());

  // Emploi du temps de la semaine pour le tableau "Ta journée"
  const scope = learner
    ? user.classGroupId
      ? eq(schema.scheduleEntries.classGroupId, user.classGroupId)
      : null
    : user.role === "TEACHER" && courseIds.length
      ? inArray(schema.scheduleEntries.courseId, courseIds)
      : null;
  const week = scope ? await db.query.scheduleEntries.findMany({ where: scope }) : [];

  const announcements = await db.query.announcements.findMany({
    where:
      user.role === "ADMIN"
        ? undefined
        : user.classGroupId
          ? or(isNull(schema.announcements.classGroupId), eq(schema.announcements.classGroupId, user.classGroupId))
          : isNull(schema.announcements.classGroupId),
    orderBy: (a, { desc }) => [desc(a.pinned), desc(a.createdAt)],
    limit: 3,
  });

  const recent = courseIds.length
    ? await db.query.courseItems.findMany({
        where: inArray(schema.courseItems.courseId, courseIds),
        with: { course: { columns: { id: true, title: true, color: true } } },
        orderBy: (i, { desc }) => [desc(i.createdAt)],
        limit: 5,
      })
    : [];

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const assignments =
    learner && courseIds.length
      ? await db.query.courseItems.findMany({
          where: and(
            inArray(schema.courseItems.courseId, courseIds),
            eq(schema.courseItems.type, "ASSIGNMENT"),
            gte(schema.courseItems.dueDate, weekAgo),
          ),
          with: { course: { columns: { id: true, title: true, color: true } } },
          orderBy: (i, { asc }) => [asc(i.dueDate)],
          limit: 5,
        })
      : [];

  const counts = user.role === "TEACHER" ? await courseCounts(courseIds) : null;

  // Administration : premiers pas et chiffres de l'école
  let setup: { label: string; done: boolean; href: string; action: string }[] = [];
  let figures: { students: number; teachers: number; classes: number; slots: number } | null = null;
  if (user.role === "ADMIN") {
    const [[cls], [teachers], [students], [slots], [annCount]] = await Promise.all([
      db.select({ n: count() }).from(schema.classGroups),
      db.select({ n: count() }).from(schema.users).where(eq(schema.users.role, "TEACHER")),
      db.select({ n: count() }).from(schema.users).where(or(eq(schema.users.role, "STUDENT"), eq(schema.users.role, "AMBASSADOR"))),
      db.select({ n: count() }).from(schema.scheduleEntries),
      db.select({ n: count() }).from(schema.announcements).where(lt(schema.announcements.createdAt, new Date())),
    ]);
    figures = { students: students.n, teachers: teachers.n, classes: cls.n, slots: slots.n };
    setup = [
      { label: "Créer les classes", done: cls.n > 0, href: "/admin?tab=classes", action: "Créer une classe" },
      { label: "Créer les comptes des enseignants", done: teachers.n > 0, href: "/admin", action: "Créer un compte" },
      { label: "Créer les cours de chaque classe", done: courses.length > 0, href: "/courses", action: "Créer un cours" },
      { label: "Mettre l'emploi du temps en ligne", done: slots.n > 0, href: "/schedule", action: "Ajouter des créneaux" },
      { label: "Publier une première annonce", done: annCount.n > 0, href: "/announcements", action: "Écrire une annonce" },
    ];
  }
  const setupDone = setup.filter((s) => s.done).length;

  return (
    <>
      <PageHeader title={`Bonjour ${firstName}`} description={longDate.charAt(0).toUpperCase() + longDate.slice(1)} />

      {learner && !user.classGroupId && (
        <div className="mb-6 rounded-2xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          Ton compte n'est rattaché à aucune classe. Demande à l'administration de t'ajouter à ta classe pour voir tes cours.
        </div>
      )}

      {/* Le tableau : ta journée, ou les premiers pas pour l'administration */}
      {user.role === "ADMIN" ? (
        <AdminBoard setup={setup} done={setupDone} figures={figures!} />
      ) : (
        <TodayBoard week={week} now={now} teacherView={user.role === "TEACHER"} />
      )}

      {learner && <AskBar />}
      {user.role === "TEACHER" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/courses" variant="secondary" icon={PenLine}>
            Publier dans un cours
          </ButtonLink>
          <ButtonLink href="/ai/course" variant="secondary" icon={Sparkles}>
            Préparer un cours avec l'IA
          </ButtonLink>
          <ButtonLink href="/ai/presentation" variant="secondary" icon={Presentation}>
            Générer une présentation
          </ButtonLink>
        </div>
      )}

      <div className="mt-10 grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {learner && (
            <Section title="À rendre" action={<Link href="/courses" className="text-sm font-bold text-accent hover:underline">Mes cours</Link>}>
              {assignments.length ? (
                <Panel>
                  <ul className="divide-y divide-line">
                    {assignments.map((a) => {
                      const due = dueLabel(a.dueDate!);
                      return (
                        <li key={a.id}>
                          <Link href={`/courses/${a.course.id}#${a.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-paper/60 sm:items-center sm:px-5">
                            <CourseDot color={a.course.color} className="mt-2 sm:mt-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold text-ink">{a.title}</span>
                              <span className="block truncate text-[13px] text-muted">{a.course.title}</span>
                              <Badge tone={due.tone} className="mt-1.5 sm:hidden">
                                {due.text}
                              </Badge>
                            </span>
                            <span className="hidden shrink-0 sm:block">
                              <Badge tone={due.tone}>{due.text}</Badge>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : (
                <p className="rounded-2xl bg-white/70 px-4 py-4 text-sm text-muted ring-1 ring-line">Rien à rendre pour le moment.</p>
              )}
            </Section>
          )}

          {user.role === "TEACHER" && (
            <Section title="Tes cours" action={<Link href="/courses" className="text-sm font-bold text-accent hover:underline">Tout voir</Link>}>
              {courses.length ? (
                <Panel>
                  <ul className="divide-y divide-line">
                    {courses.map((c) => {
                      const k = counts?.get(c.id);
                      return (
                        <li key={c.id}>
                          <Link href={`/courses/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-paper/60 sm:px-5">
                            <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold text-ink">{c.title}</span>
                              <span className="block truncate text-[13px] text-muted">{c.classGroup.name}</span>
                            </span>
                            <span className="hidden text-right text-[13px] text-muted sm:block">
                              {plural(k?.items ?? 0, "publication")}
                              <br />
                              {plural(k?.docs ?? 0, "document")}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : (
                <Empty icon={BookOpen} title="Tu n'as pas encore de cours" action={<ButtonLink href="/courses" icon={FilePlus2}>Créer un cours</ButtonLink>}>
                  Crée ton premier cours pour y publier tes supports et devoirs.
                </Empty>
              )}
            </Section>
          )}

          <Section title={learner ? "Nouveau dans tes cours" : "Dernières publications"}>
            {recent.length ? (
              <Panel>
                <ul className="divide-y divide-line">
                  {recent.map((i) => (
                    <li key={i.id}>
                      <Link href={`/courses/${i.course.id}#${i.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-paper/60 sm:px-5">
                        <CourseDot color={i.course.color} className="mt-[7px]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-ink">{i.title}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {i.course.title}, {relativeTime(i.createdAt)}
                          </span>
                        </span>
                        {i.type === "ASSIGNMENT" && <Badge tone="warn">Devoir</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : (
              <Empty icon={BookOpen} title="Rien de publié pour l'instant">
                Les supports, devoirs et annonces de tes cours apparaîtront ici.
              </Empty>
            )}
          </Section>
        </div>

        <div>
          <Section title="Annonces" action={<Link href="/announcements" className="text-sm font-bold text-accent hover:underline">Tout voir</Link>}>
            {announcements.length ? (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className={cx("rounded-2xl bg-white px-4 py-3.5 ring-1 ring-line", a.pinned && "border-l-4 border-chalk")}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-ink">{a.title}</p>
                      {a.pinned && <Pin size={15} className="mt-1 shrink-0 text-warn" aria-label="Épinglée" />}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{a.body}</p>
                    <p className="mt-2 text-xs text-faint">{relativeTime(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={Megaphone}>Aucune annonce pour le moment.</Empty>
            )}
          </Section>

          {learner && courses.length > 0 && (
            <Section title="Mes cours">
              <ul className="space-y-1">
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link href={`/courses/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white">
                      <CourseDot color={c.color} />
                      <span className="truncate font-semibold text-ink">{c.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

/** Raccourci vers le tuteur : ressemble à un champ de saisie, mène à la discussion. */
function AskBar() {
  return (
    <Link
      href="/ai/chat"
      className="group mt-4 flex items-center gap-3 rounded-2xl border border-line-strong bg-white py-2 pl-4 pr-2 transition-colors hover:border-accent"
    >
      <Sparkles size={19} className="shrink-0 text-accent" aria-hidden />
      <span className="flex-1 truncate text-md text-faint">Pose une question sur un cours...</span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors group-hover:bg-accent-strong">
        <ArrowUp size={18} strokeWidth={2.25} aria-hidden />
      </span>
    </Link>
  );
}

/** Pour l'administration : les étapes de mise en route, écrites au tableau. */
function AdminBoard({
  setup,
  done,
  figures,
}: {
  setup: { label: string; done: boolean; href: string; action: string }[];
  done: number;
  figures: { students: number; teachers: number; classes: number; slots: number };
}) {
  const next = setup.find((s) => !s.done);
  return (
    <section aria-label="Mise en route" className="board rounded-3xl px-5 py-6 sm:px-8 sm:py-8">
      {next ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-chalk">Mise en route de la plateforme</p>
            <p className="text-sm text-white/70">
              {done} étape{done > 1 ? "s" : ""} sur {setup.length}
            </p>
          </div>
          <ol className="mt-4 space-y-2.5">
            {setup.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <span
                  className={cx(
                    "tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    s.done ? "bg-chalk text-ink" : s === next ? "border-2 border-chalk text-chalk" : "border border-white/30 text-white/60",
                  )}
                >
                  {s.done ? <Check size={15} strokeWidth={3} aria-label="Fait" /> : i + 1}
                </span>
                <span className={cx("text-md", s.done ? "text-white/55 line-through decoration-white/30" : s === next ? "font-bold" : "text-white/80")}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <ButtonLink href={next.href} variant="light" className="mt-6">
            {next.action}
          </ButtonLink>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-chalk">L'école en un coup d'œil</p>
          <p className="mt-3 max-w-2xl text-[1.375rem] font-bold leading-snug sm:text-[1.6rem]">
            {plural(figures.students, "étudiant")}, {plural(figures.teachers, "enseignant")} et {plural(figures.classes, "classe")}.
          </p>
          <p className="mt-2 text-md text-white/75">{plural(figures.slots, "créneau", "créneaux")} de cours dans l'emploi du temps de la semaine.</p>
        </>
      )}
    </section>
  );
}
