import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser, visibleCourses } from "@/lib/access";
import { deleteChat } from "@/app/actions/ai";
import { ConfirmButton } from "@/components/forms";
import { btn, cx, Select } from "@/components/ui";
import { Chat } from "./Chat";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

export const metadata = { title: "Tuteur IA" };

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ session?: string; course?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const courses = await visibleCourses(user);
  const sessions = await db.query.chatSessions.findMany({
    where: eq(schema.chatSessions.userId, user.id),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    limit: 40,
  });
  const session = sp.session
    ? await db.query.chatSessions.findFirst({
        where: and(eq(schema.chatSessions.id, sp.session), eq(schema.chatSessions.userId, user.id)),
      })
    : null;
  const messages = session
    ? await db
        .select({ id: schema.chatMessages.id, role: schema.chatMessages.role, content: schema.chatMessages.content, sources: schema.chatMessages.sources })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, session.id))
        .orderBy(asc(schema.chatMessages.createdAt))
    : [];
  const courseId = session?.courseId ?? (courses.some((c) => c.id === sp.course) ? sp.course! : null);
  const course = courses.find((c) => c.id === courseId);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <Link href="/ai/chat" className={cx(btn.primary, "mb-4 w-full")}>
          Nouvelle discussion
        </Link>
        <div className="space-y-0.5">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/ai/chat?session=${s.id}`}
              className={cx(
                "block truncate rounded-lg px-3 py-2 text-sm",
                s.id === session?.id ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:bg-stone-100",
              )}
            >
              {s.title}
            </Link>
          ))}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h1 className="text-xl font-semibold">{session?.title ?? "Tuteur IA"}</h1>
            <p className="text-sm text-muted">
              {course ? `Basé sur les documents de ${course.title}` : "Basé sur les documents de tous tes cours"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!session && courses.length > 0 && (
              <form className="flex gap-2">
                <Select name="course" defaultValue={courseId ?? ""} className="w-auto py-1.5">
                  <option value="">Tous mes cours</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
                <button className={cx(btn.secondary, "py-1.5")}>Choisir</button>
              </form>
            )}
            {session && (
              <>
                <Link href="/ai/chat" className={cx(btn.secondary, "py-1.5 lg:hidden")}>
                  Nouvelle
                </Link>
                <form action={deleteChat}>
                  <input type="hidden" name="id" value={session.id} />
                  <ConfirmButton message="Supprimer cette discussion ?">Supprimer</ConfirmButton>
                </form>
              </>
            )}
          </div>
        </div>
        <Chat key={session?.id ?? `new-${courseId}`} sessionId={session?.id ?? null} courseId={courseId} initial={messages} />
      </div>
    </div>
  );
}
