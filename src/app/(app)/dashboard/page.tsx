import Link from "next/link";
import { and, count, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { isStudentLike, requireUser, visibleCourses } from "@/lib/access";
import { Badge, ButtonLink, Card, DAYS, Empty, formatDate, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Tableau de bord" };

function todayInDakar() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Dakar" }));
  return d.getDay(); // 0 = dimanche
}

export default async function Dashboard() {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  const courseIds = courses.map((c) => c.id);
  const day = todayInDakar();

  const today =
    day >= 1 && day <= 6 && courseIds.length
      ? await db.query.scheduleEntries.findMany({
          where: and(
            eq(schema.scheduleEntries.dayOfWeek, day),
            isStudentLike(user) && user.classGroupId
              ? eq(schema.scheduleEntries.classGroupId, user.classGroupId)
              : inArray(schema.scheduleEntries.courseId, courseIds),
          ),
          orderBy: (s, { asc }) => [asc(s.startTime)],
        })
      : [];

  const announcements = await db.query.announcements.findMany({
    where:
      user.role === "ADMIN"
        ? undefined
        : user.classGroupId
          ? or(isNull(schema.announcements.classGroupId), eq(schema.announcements.classGroupId, user.classGroupId))
          : isNull(schema.announcements.classGroupId),
    orderBy: (a, { desc }) => [desc(a.pinned), desc(a.createdAt)],
    limit: 4,
  });

  const recent = courseIds.length
    ? await db.query.courseItems.findMany({
        where: inArray(schema.courseItems.courseId, courseIds),
        with: { course: { columns: { id: true, title: true, color: true } } },
        orderBy: (i, { desc }) => [desc(i.createdAt)],
        limit: 6,
      })
    : [];

  const upcoming = courseIds.length
    ? await db.query.courseItems.findMany({
        where: and(
          inArray(schema.courseItems.courseId, courseIds),
          eq(schema.courseItems.type, "ASSIGNMENT"),
          gte(schema.courseItems.dueDate, new Date()),
        ),
        with: { course: { columns: { id: true, title: true } } },
        orderBy: (i, { asc }) => [asc(i.dueDate)],
        limit: 5,
      })
    : [];

  let stats: { label: string; value: number }[] = [];
  if (user.role === "ADMIN") {
    const [[u], [d], [p]] = await Promise.all([
      db.select({ n: count() }).from(schema.users),
      db.select({ n: count() }).from(schema.documents).where(eq(schema.documents.aiOnly, false)),
      db.select({ n: count() }).from(schema.documents).where(eq(schema.documents.aiOnly, true)),
    ]);
    stats = [
      { label: "Utilisateurs", value: u.n },
      { label: "Cours", value: courses.length },
      { label: "Documents des cours", value: d.n },
      { label: "Documents de la base IA", value: p.n },
    ];
  }

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Bonjour ${firstName}`}
        subtitle={day >= 1 && day <= 6 ? `${DAYS[day]} ${formatDate(new Date())}` : formatDate(new Date())}
        actions={
          <>
            <ButtonLink href="/ai/chat" variant="secondary">
              Poser une question à l'IA
            </ButtonLink>
            {user.role === "TEACHER" && <ButtonLink href="/courses">Publier dans un cours</ButtonLink>}
          </>
        }
      />

      {isStudentLike(user) && !user.classGroupId && (
        <Card className="mb-8 border-amber-200 bg-amber-50 p-4 text-sm text-warn">
          Ton compte n'est rattaché à aucune classe. Contacte l'administration pour accéder à tes cours.
        </Card>
      )}

      {stats.length > 0 && (
        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Aujourd'hui" aside={<Link href="/schedule" className="text-sm text-accent hover:underline">Semaine complète</Link>}>
            {today.length ? (
              <Card className="divide-y divide-line">
                {today.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-28 shrink-0 text-sm font-medium tabular-nums">
                      {s.startTime} – {s.endTime}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-sm text-muted">{[s.room, s.teacherName].filter(Boolean).join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <Empty>Aucun cours prévu aujourd'hui.</Empty>
            )}
          </Section>

          <Section title="Dernières publications">
            {recent.length ? (
              <Card className="divide-y divide-line">
                {recent.map((i) => (
                  <Link key={i.id} href={`/courses/${i.course.id}#${i.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.course.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{i.title}</div>
                      <div className="text-sm text-muted">
                        {i.course.title} · {formatDate(i.createdAt)}
                      </div>
                    </div>
                    {i.type === "ASSIGNMENT" && <Badge tone="warn">Devoir</Badge>}
                  </Link>
                ))}
              </Card>
            ) : (
              <Empty>Rien de publié pour l'instant.</Empty>
            )}
          </Section>
        </div>

        <div>
          <Section title="Annonces" aside={<Link href="/announcements" className="text-sm text-accent hover:underline">Tout voir</Link>}>
            {announcements.length ? (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <Card key={a.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{a.title}</div>
                      {a.pinned && <Badge tone="accent">Épinglée</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{a.body}</p>
                    <div className="mt-2 text-xs text-faint">{formatDate(a.createdAt)}</div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty>Aucune annonce.</Empty>
            )}
          </Section>

          <Section title="Devoirs à venir">
            {upcoming.length ? (
              <Card className="divide-y divide-line">
                {upcoming.map((i) => (
                  <Link key={i.id} href={`/courses/${i.course.id}#${i.id}`} className="block px-4 py-3 hover:bg-stone-50">
                    <div className="font-medium">{i.title}</div>
                    <div className="text-sm text-muted">
                      {i.course.title} · pour le {formatDate(i.dueDate!)}
                    </div>
                  </Link>
                ))}
              </Card>
            ) : (
              <Empty>Aucun devoir en attente.</Empty>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
