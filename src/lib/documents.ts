import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { chunkText, extractText } from "./extract";
import { MAX_UPLOAD_BYTES, saveFile } from "./storage";
import type { DocKind } from "@/db/schema";

const ALLOWED = /\.(pdf|docx?|pptx?|xlsx?|txt|md|tex|png|jpe?g|zip|py|m|c|cpp|java|ipynb|csv)$/i;

export type NewDocument = {
  file: File;
  title?: string;
  description?: string;
  kind: DocKind;
  source: "TEACHER" | "STUDENT" | "AMBASSADOR" | "ADMIN";
  status: "PENDING" | "PUBLISHED";
  aiOnly?: boolean;
  courseId: string;
  itemId?: string | null;
  uploaderId: string;
  academicYear?: string | null;
  aiEnabled?: boolean;
};

export function validateFile(file: File | null): string | null {
  if (!file || file.size === 0) return "Choisis un fichier.";
  if (file.size > MAX_UPLOAD_BYTES) return `Fichier trop lourd (max ${Math.round(MAX_UPLOAD_BYTES / 1048576)} Mo).`;
  if (!ALLOWED.test(file.name)) return "Format de fichier non pris en charge.";
  return null;
}

/** Enregistre le fichier, crée le document et indexe son texte pour l'IA. */
export async function storeDocument(input: NewDocument) {
  const data = Buffer.from(await input.file.arrayBuffer());
  const storageKey = await saveFile(data, input.file.name, input.file.type || "application/octet-stream");
  const [doc] = await db
    .insert(schema.documents)
    .values({
      title: input.title?.trim() || input.file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
      description: input.description?.trim() || null,
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
      storageKey,
      kind: input.kind,
      source: input.source,
      status: input.status,
      courseId: input.courseId,
      itemId: input.itemId ?? null,
      uploaderId: input.uploaderId,
      academicYear: input.academicYear || null,
      aiEnabled: input.aiEnabled ?? true,
      aiOnly: input.aiOnly ?? false,
    })
    .returning();

  const text = await extractText(data, doc.mimeType, doc.fileName);
  const chunks = chunkText(text);
  if (chunks.length) {
    await db
      .insert(schema.documentChunks)
      .values(chunks.map((content, position) => ({ documentId: doc.id, position, content })));
  }
  return doc;
}

export async function getDocument(id: string) {
  return db.query.documents.findFirst({
    where: eq(schema.documents.id, id),
    with: { course: true },
  });
}

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  COURSE: "Cours",
  TD: "TD",
  TP: "TP",
  EXAM: "Examen",
  HOMEWORK: "Devoir",
  CORRECTION: "Correction",
  SUMMARY: "Fiche de révision",
  OTHER: "Autre",
};
