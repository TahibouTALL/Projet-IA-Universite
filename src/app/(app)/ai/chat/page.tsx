import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser, visibleCourses } from "@/lib/access";
import { relativeTime } from "@/lib/format";
import { deleteChat } from "@/app/actions/ai";
import { ConfirmIcon } from "@/components/ConfirmIcon";
import { button, CourseDot, cx } from "@/components/ui";
import { Chat } from "./Chat";

export const maxDuration = 60;
export const metadata = { title: "Tuteur IA" };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; course?: string; q?: string }>;
}) {
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
  const scopeLabel = course ? `« ${course.title} »` : "tous tes cours";

  return (
    <div className="grid gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <Link href="/ai/chat" className={cx(button("primary"), "mb-4 w-full")}>
          <Plus size={17} strokeWidth={2.25} aria-hidden />
          Nouvelle discussion
        </Link>
        {sessions.length > 0 && <p className="mb-1.5 px-2 text-xs font-bold text-faint">Discussions</p>}
        <ul className="space-y-0.5">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/ai/chat?session=${s.id}`}
                aria-current={s.id === session?.id ? "page" : undefined}
                className={cx(
                  "block rounded-lg px-2.5 py-2",
                  s.id === session?.id ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                <span className="block truncate text-sm font-semibold">{s.title}</span>
                <span className="block text-xs text-faint">{relativeTime(s.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex items-start gap-3 border-b border-line pb-4">
          <Link href="/ai" className="mt-1 hidden rounded-md text-muted hover:text-ink sm:block lg:hidden" aria-label="Assistant IA">
            <ChevronLeft size={20} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.25rem] font-bold leading-snug text-ink">{session?.title ?? "Tuteur IA"}</h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
              {course && <CourseDot color={course.color} />}
              {course ? course.title : "Tous tes cours"}
            </p>
          </div>
          {session ? (
            <div className="flex items-center gap-1">
              <Link href="/ai/chat" className={cx(button("secondary", "sm"), "lg:hidden")}>
                <Plus size={15} aria-hidden />
                Nouvelle
              </Link>
              <form action={deleteChat}>
                <input type="hidden" name="id" value={session.id} />
                <ConfirmIcon message="Supprimer cette discussion ?" label="Supprimer la discussion">
                  <Trash2 size={16} aria-hidden />
                </ConfirmIcon>
              </form>
            </div>
          ) : null}
        </div>

        {!session && courses.length > 0 && (
          <nav aria-label="Cours de la discussion" className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <span className="flex shrink-0 items-center text-sm font-semibold text-faint">Sur :</span>
            {[{ id: "", title: "Tous mes cours", color: "" }, ...courses].map((c) => {
              const on = (courseId ?? "") === c.id;
              return (
                <Link
                  key={c.id || "all"}
                  href={c.id ? `/ai/chat?course=${c.id}` : "/ai/chat"}
                  aria-current={on ? "true" : undefined}
                  className={cx(
                    "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
                    on ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong bg-white text-muted hover:text-ink",
                  )}
                >
                  {c.color && <CourseDot color={c.color} />}
                  {c.title}
                </Link>
              );
            })}
          </nav>
        )}

        <Chat
          key={session?.id ?? `new-${courseId}`}
          sessionId={session?.id ?? null}
          courseId={courseId}
          initial={messages}
          scopeLabel={scopeLabel}
          initialText={session ? "" : (sp.q ?? "").slice(0, 500)}
        />
      </div>
    </div>
  );
}
