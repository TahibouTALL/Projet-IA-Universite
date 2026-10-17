import { and, count, eq, inArray, max } from "drizzle-orm";
import { db, schema } from "@/db";

export type CourseCounts = { items: number; docs: number; lastActivity: Date | null };

/** Nombre de publications et de documents visibles par cours, et date de la dernière publication. */
export async function courseCounts(courseIds: string[]): Promise<Map<string, CourseCounts>> {
  const out = new Map<string, CourseCounts>();
  if (!courseIds.length) return out;
  const [items, docs] = await Promise.all([
    db
      .select({ id: schema.courseItems.courseId, n: count(), last: max(schema.courseItems.createdAt) })
      .from(schema.courseItems)
      .where(inArray(schema.courseItems.courseId, courseIds))
      .groupBy(schema.courseItems.courseId),
    db
      .select({ id: schema.documents.courseId, n: count() })
      .from(schema.documents)
      .where(
        and(
          inArray(schema.documents.courseId, courseIds),
          eq(schema.documents.aiOnly, false),
          eq(schema.documents.status, "PUBLISHED"),
        ),
      )
      .groupBy(schema.documents.courseId),
  ]);
  for (const id of courseIds) out.set(id, { items: 0, docs: 0, lastActivity: null });
  for (const r of items) if (r.id) out.set(r.id, { ...out.get(r.id)!, items: r.n, lastActivity: r.last ? new Date(r.last) : null });
  for (const r of docs) if (r.id) out.set(r.id, { ...out.get(r.id)!, docs: r.n });
  return out;
}
