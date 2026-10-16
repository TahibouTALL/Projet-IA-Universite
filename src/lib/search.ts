// Recherche plein texte (PostgreSQL, dictionnaire français) dans les documents publiés
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type ChunkHit = { documentId: string; title: string; content: string; rank: number };

function toTsQuery(question: string): string | null {
  const words = question
    .toLowerCase()
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2)
    .slice(0, 24);
  if (!words.length) return null;
  return [...new Set(words)].map((w) => `${w}:*`).join(" | ");
}

export async function searchChunks(question: string, courseIds: string[], limit = 6): Promise<ChunkHit[]> {
  const q = toTsQuery(question);
  if (!q || !courseIds.length) return [];
  const result = await db.execute<ChunkHit>(sql`
    SELECT c.document_id AS "documentId", d.title, c.content,
           ts_rank(to_tsvector('french', c.content), to_tsquery('french', ${q})) AS rank
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.status = 'PUBLISHED' AND d.ai_enabled = true
      AND d.course_id IN (${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)})
      AND to_tsvector('french', c.content) @@ to_tsquery('french', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  return result.rows;
}
