"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import type { DocKind } from "@/db/schema";
import { canManageCourse, canViewCourse, isStudentLike, requireUser } from "@/lib/access";
import { storeDocument, validateFile } from "@/lib/documents";
import { removeFile } from "@/lib/storage";
import type { ActionResult } from "@/components/forms";

async function loadCourse(courseId: string) {
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, courseId) });
  if (!course) throw new Error("Cours introuvable");
  return course;
}

const CourseSchema = z.object({
  title: z.string().trim().min(2, "Donne un titre au cours."),
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  classGroupId: z.string().min(1, "Choisis la classe."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#0f766e"),
  teacherId: z.string().optional(),
});

export async function createCourse(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return { error: "Action réservée aux enseignants." };
  const parsed = CourseSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const teacherId = user.role === "ADMIN" && v.teacherId ? v.teacherId : user.id;
  const [course] = await db
    .insert(schema.courses)
    .values({
      title: v.title,
      code: v.code || null,
      description: v.description || null,
      classGroupId: v.classGroupId,
      color: v.color,
      teacherId,
    })
    .returning();
  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}

export async function deleteCourse(data: FormData) {
  const user = await requireUser();
  const course = await loadCourse(String(data.get("courseId")));
  if (!canManageCourse(user, course)) throw new Error("Non autorisé");
  const docs = await db.query.documents.findMany({ where: eq(schema.documents.courseId, course.id) });
  await db.delete(schema.courses).where(eq(schema.courses.id, course.id));
  await Promise.all(docs.map((d) => removeFile(d.storageKey)));
  revalidatePath("/courses");
  redirect("/courses");
}

const ItemSchema = z.object({
  courseId: z.string(),
  type: z.enum(["LESSON", "ASSIGNMENT", "ANNOUNCEMENT"]),
  title: z.string().trim().min(2, "Donne un titre à la publication."),
  content: z.string().default(""),
  dueDate: z.string().optional(),
});

export async function createItem(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ItemSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const course = await loadCourse(v.courseId);
  if (!canManageCourse(user, course)) return { error: "Seul l'enseignant du cours peut publier ici." };

  const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) {
    const err = validateFile(f);
    if (err) return { error: `${f.name} : ${err}` };
  }

  const [item] = await db
    .insert(schema.courseItems)
    .values({
      courseId: course.id,
      authorId: user.id,
      type: v.type,
      title: v.title,
      content: v.content,
      dueDate: v.type === "ASSIGNMENT" && v.dueDate ? new Date(v.dueDate) : null,
    })
    .returning();

  const kind: DocKind = v.type === "ASSIGNMENT" ? "HOMEWORK" : "COURSE";
  for (const file of files) {
    await storeDocument({
      file,
      kind,
      source: user.role === "ADMIN" ? "ADMIN" : "TEACHER",
      status: "PUBLISHED",
      courseId: course.id,
      itemId: item.id,
      uploaderId: user.id,
    });
  }
  revalidatePath(`/courses/${course.id}`);
  return { ok: "Publication ajoutée." };
}

export async function deleteItem(data: FormData) {
  const user = await requireUser();
  const item = await db.query.courseItems.findFirst({
    where: eq(schema.courseItems.id, String(data.get("itemId"))),
    with: { course: true, documents: true },
  });
  if (!item || !canManageCourse(user, item.course)) throw new Error("Non autorisé");
  await db.delete(schema.courseItems).where(eq(schema.courseItems.id, item.id));
  await Promise.all(item.documents.map((d) => removeFile(d.storageKey)));
  revalidatePath(`/courses/${item.courseId}`);
}

const DOC_KINDS = ["COURSE", "TD", "TP", "EXAM", "HOMEWORK", "CORRECTION", "SUMMARY", "OTHER"] as const;

const UploadSchema = z.object({
  courseId: z.string().min(1, "Choisis le cours concerné."),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  kind: z.enum(DOC_KINDS).default("COURSE"),
  academicYear: z.string().trim().optional(),
});

/**
 * Dépôt d'un document dans un cours.
 * - enseignant / admin : publié directement
 * - étudiant : partagé avec la classe, publié directement
 * - ambassadeur (mode "contribution") : en attente de validation avant d'alimenter l'IA
 */
export async function uploadDocument(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = UploadSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const file = data.get("file") as File | null;
  const err = validateFile(file);
  if (err) return { error: err };

  const course = await loadCourse(v.courseId);
  if (!canViewCourse(user, course)) return { error: "Tu n'as pas accès à ce cours." };

  const asContribution = data.get("mode") === "contribution" && user.role === "AMBASSADOR";
  const source = canManageCourse(user, course)
    ? user.role === "ADMIN"
      ? "ADMIN"
      : "TEACHER"
    : asContribution
      ? "AMBASSADOR"
      : "STUDENT";

  await storeDocument({
    file: file!,
    title: v.title,
    description: v.description,
    kind: v.kind,
    source,
    status: source === "AMBASSADOR" ? "PENDING" : "PUBLISHED",
    courseId: course.id,
    uploaderId: user.id,
    academicYear: v.academicYear,
  });

  revalidatePath(`/courses/${course.id}`);
  revalidatePath("/documents");
  revalidatePath("/ambassador");
  return {
    ok:
      source === "AMBASSADOR"
        ? "Merci ! Ta contribution sera visible après validation."
        : isStudentLike(user)
          ? "Document partagé avec ta classe."
          : "Document publié.",
  };
}

export async function deleteDocument(data: FormData) {
  const user = await requireUser();
  const doc = await db.query.documents.findFirst({
    where: eq(schema.documents.id, String(data.get("documentId"))),
    with: { course: true },
  });
  if (!doc) return;
  const allowed = doc.uploaderId === user.id || (doc.course && canManageCourse(user, doc.course)) || user.role === "ADMIN";
  if (!allowed) throw new Error("Non autorisé");
  await db.delete(schema.documents).where(eq(schema.documents.id, doc.id));
  await removeFile(doc.storageKey);
  revalidatePath("/documents");
  if (doc.courseId) revalidatePath(`/courses/${doc.courseId}`);
}

/** Validation ou refus d'une contribution d'ambassadeur. */
export async function reviewDocument(data: FormData) {
  const user = await requireUser();
  const doc = await db.query.documents.findFirst({
    where: and(eq(schema.documents.id, String(data.get("documentId"))), eq(schema.documents.status, "PENDING")),
    with: { course: true },
  });
  if (!doc || !doc.course || !canManageCourse(user, doc.course)) throw new Error("Non autorisé");
  const decision = data.get("decision") === "approve" ? "PUBLISHED" : "REJECTED";
  await db
    .update(schema.documents)
    .set({
      status: decision,
      reviewerId: user.id,
      reviewNote: String(data.get("note") || "") || null,
      kind: (DOC_KINDS as readonly string[]).includes(String(data.get("kind"))) ? (data.get("kind") as DocKind) : doc.kind,
    })
    .where(eq(schema.documents.id, doc.id));
  revalidatePath("/moderation");
  revalidatePath("/documents");
}
