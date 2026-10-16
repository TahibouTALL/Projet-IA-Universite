"use server";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ChatSource } from "@/db/schema";
import { canManageCourse, requireUser, visibleCourseIds, type CurrentUser } from "@/lib/access";
import { AiError } from "@/lib/ai/provider";
import {
  chatTitle,
  generateCourse,
  generateExercises,
  generatePresentation,
  tutorReply,
  type Deck,
} from "@/lib/ai/generate";
import { deckToPptx } from "@/lib/ai/pptx";
import { searchChunks } from "@/lib/search";
import { saveFile } from "@/lib/storage";
import { APP_NAME } from "@/lib/appname";
import type { ActionResult } from "@/components/forms";

/** Restreint la recherche au cours choisi (s'il est accessible), sinon à tous les cours visibles. */
async function scopeFor(user: CurrentUser, courseId?: string | null) {
  const ids = await visibleCourseIds(user);
  if (courseId && ids.includes(courseId)) return { courseIds: [courseId], courseId };
  return { courseIds: ids, courseId: null };
}

function aiMessage(e: unknown) {
  if (e instanceof AiError) return e.message;
  console.error(e);
  return "Le service IA est indisponible pour le moment. Réessaie dans un instant.";
}

// ---------- Tuteur (chat) ----------

export type ChatResponse =
  | { ok: true; sessionId: string; reply: { id: string; content: string; sources: ChatSource[] } }
  | { ok: false; error: string };

export async function sendChatMessage(input: {
  sessionId?: string | null;
  courseId?: string | null;
  content: string;
}): Promise<ChatResponse> {
  const user = await requireUser();
  const content = input.content.trim().slice(0, 8000);
  if (!content) return { ok: false, error: "Message vide." };

  let session = input.sessionId
    ? await db.query.chatSessions.findFirst({
        where: and(eq(schema.chatSessions.id, input.sessionId), eq(schema.chatSessions.userId, user.id)),
        with: { course: true },
      })
    : null;

  const scope = await scopeFor(user, session?.courseId ?? input.courseId);
  if (!session) {
    const [created] = await db
      .insert(schema.chatSessions)
      .values({ userId: user.id, courseId: scope.courseId, title: content.slice(0, 60) })
      .returning();
    session = { ...created, course: null };
  }
  const course = scope.courseId
    ? await db.query.courses.findFirst({ where: eq(schema.courses.id, scope.courseId) })
    : null;

  await db.insert(schema.chatMessages).values({ sessionId: session.id, role: "user", content });
  const history = await db
    .select({ role: schema.chatMessages.role, content: schema.chatMessages.content })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.sessionId, session.id))
    .orderBy(asc(schema.chatMessages.createdAt));

  // Contexte : la question actuelle + la précédente, pour les relances courtes ("et pourquoi ?")
  const lastUser = history.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
  const hits = await searchChunks(lastUser, scope.courseIds, 6);

  try {
    const reply = await tutorReply({ history, courseTitle: course?.title, hits, studentName: user.name.split(" ")[0] });
    const sources: ChatSource[] = [...new Map(hits.map((h) => [h.documentId, { documentId: h.documentId, title: h.title }])).values()];
    const [saved] = await db
      .insert(schema.chatMessages)
      .values({ sessionId: session.id, role: "assistant", content: reply, sources })
      .returning();

    const isFirst = history.length === 1;
    const title = isFirst ? await chatTitle(content).catch(() => content.slice(0, 60)) : undefined;
    await db
      .update(schema.chatSessions)
      .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
      .where(eq(schema.chatSessions.id, session.id));

    revalidatePath("/ai/chat");
    return { ok: true, sessionId: session.id, reply: { id: saved.id, content: reply, sources } };
  } catch (e) {
    return { ok: false, error: aiMessage(e) };
  }
}

export async function deleteChat(data: FormData) {
  const user = await requireUser();
  await db
    .delete(schema.chatSessions)
    .where(and(eq(schema.chatSessions.id, String(data.get("id"))), eq(schema.chatSessions.userId, user.id)));
  revalidatePath("/ai/chat");
  redirect("/ai/chat");
}

// ---------- Générateurs ----------

const Common = {
  topic: z.string().trim().min(3, "Précise le sujet.").max(500),
  courseId: z.string().optional(),
  extra: z.string().trim().max(1500).optional(),
};

export async function generateCourseAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ ...Common, level: z.string().trim().default("Licence"), depth: z.enum(["court", "standard", "approfondi"]).default("standard") })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  const scope = await scopeFor(user, p.courseId);
  let id: string;
  try {
    const hits = await searchChunks(p.topic, scope.courseIds, 8);
    const content = await generateCourse(p, hits);
    const [g] = await db
      .insert(schema.generations)
      .values({ type: "COURSE", topic: p.topic, params: { level: p.level, depth: p.depth, sources: hits.map((h) => h.title) }, content, userId: user.id, courseId: scope.courseId })
      .returning();
    id = g.id;
  } catch (e) {
    return { error: aiMessage(e) };
  }
  redirect(`/ai/g/${id}`);
}

export async function generateExercisesAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({
      ...Common,
      level: z.string().trim().default("Licence"),
      count: z.coerce.number().int().min(1).max(10).default(4),
      difficulty: z.enum(["facile", "moyen", "difficile", "progressif"]).default("progressif"),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  const scope = await scopeFor(user, p.courseId);
  let id: string;
  try {
    const hits = await searchChunks(p.topic, scope.courseIds, 8);
    const { exercises, solution } = await generateExercises(p, hits);
    const [g] = await db
      .insert(schema.generations)
      .values({ type: "EXERCISES", topic: p.topic, params: { level: p.level, count: p.count, difficulty: p.difficulty, sources: hits.map((h) => h.title) }, content: exercises, solution, userId: user.id, courseId: scope.courseId })
      .returning();
    id = g.id;
  } catch (e) {
    return { error: aiMessage(e) };
  }
  redirect(`/ai/g/${id}`);
}

export async function generatePresentationAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return { error: "Fonction réservée aux enseignants." };
  const parsed = z
    .object({ ...Common, audience: z.string().trim().default("Étudiants"), slides: z.coerce.number().int().min(3).max(25).default(10) })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  const scope = await scopeFor(user, p.courseId);
  let id: string;
  try {
    const hits = await searchChunks(p.topic, scope.courseIds, 8);
    const deck = await generatePresentation(p, hits);
    const [g] = await db
      .insert(schema.generations)
      .values({ type: "PRESENTATION", topic: p.topic, params: { audience: p.audience, slides: p.slides, sources: hits.map((h) => h.title) }, content: JSON.stringify(deck), userId: user.id, courseId: scope.courseId })
      .returning();
    id = g.id;
  } catch (e) {
    return { error: aiMessage(e) };
  }
  redirect(`/ai/g/${id}`);
}

/** Publie un contenu généré dans un cours (enseignant du cours ou admin). */
export async function publishGeneration(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const g = await db.query.generations.findFirst({
    where: and(eq(schema.generations.id, String(data.get("id"))), eq(schema.generations.userId, user.id)),
  });
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, String(data.get("courseId") || "")) });
  if (!g) return { error: "Contenu introuvable." };
  if (!course || !canManageCourse(user, course)) return { error: "Choisis un de tes cours." };
  const withSolution = data.get("withSolution") === "on";

  if (g.type === "PRESENTATION") {
    const deck = JSON.parse(g.content) as Deck;
    const buffer = await deckToPptx(deck, APP_NAME);
    const fileName = `${deck.title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60) || "presentation"}.pptx`;
    const [item] = await db
      .insert(schema.courseItems)
      .values({ courseId: course.id, authorId: user.id, type: "LESSON", title: deck.title, content: deck.subtitle ?? "" })
      .returning();
    const storageKey = await saveFile(buffer, fileName);
    await db.insert(schema.documents).values({
      title: deck.title,
      fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: buffer.length,
      storageKey,
      kind: "COURSE",
      source: user.role === "ADMIN" ? "ADMIN" : "TEACHER",
      courseId: course.id,
      itemId: item.id,
      uploaderId: user.id,
      aiEnabled: false,
    });
  } else {
    const content =
      g.type === "EXERCISES" && withSolution && g.solution ? `${g.content}\n\n---\n\n# Correction\n\n${g.solution}` : g.content;
    const title = g.type === "EXERCISES" ? `Exercices : ${g.topic}` : g.content.match(/^#\s+(.+)$/m)?.[1] ?? g.topic;
    await db.insert(schema.courseItems).values({ courseId: course.id, authorId: user.id, type: "LESSON", title: title.slice(0, 200), content });
  }
  revalidatePath(`/courses/${course.id}`);
  return { ok: "Publié dans le cours." };
}

export async function deleteGeneration(data: FormData) {
  const user = await requireUser();
  await db
    .delete(schema.generations)
    .where(and(eq(schema.generations.id, String(data.get("id"))), eq(schema.generations.userId, user.id)));
  revalidatePath("/ai");
  redirect("/ai");
}
