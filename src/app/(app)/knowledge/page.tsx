import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole, visibleCourses } from "@/lib/access";
import { DocList } from "@/components/DocList";
import { UploadForm } from "@/components/UploadForm";
import { Card, Empty, PageHeader, Section } from "@/components/ui";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

export const metadata = { title: "Base de l'IA" };

export default async function KnowledgePage() {
  const user = await requireRole("TEACHER", "ADMIN");
  const courses = await visibleCourses(user);
  const ids = courses.map((c) => c.id);
  const docs = ids.length
    ? await db.query.documents.findMany({
        where: and(eq(schema.documents.aiOnly, true), inArray(schema.documents.courseId, ids)),
        with: { uploader: { columns: { name: true } } },
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      })
    : [];
  const chunkCounts = docs.length
    ? await db
        .select({ id: schema.documentChunks.documentId, n: count() })
        .from(schema.documentChunks)
        .where(inArray(schema.documentChunks.documentId, docs.map((d) => d.id)))
        .groupBy(schema.documentChunks.documentId)
    : [];
  const indexed = new Map(chunkCounts.map((c) => [c.id, c.n]));
  const unreadable = docs.filter((d) => !indexed.get(d.id));

  return (
    <>
      <PageHeader
        title="Base de connaissances de l'IA"
        subtitle="Documents déposés par les ambassadeurs et les enseignants pour donner du contexte à l'IA. Ils ne sont jamais affichés aux étudiants : l'IA s'en sert pour répondre, expliquer et créer des exercices."
      />
      {unreadable.length > 0 && (
        <Card className="mb-8 border-amber-200 bg-amber-50 p-4 text-sm text-warn">
          {unreadable.length} document(s) sans texte lisible (scan ou image) : l'IA ne peut pas encore les exploiter. Un PDF avec du texte sélectionnable fonctionne mieux.
        </Card>
      )}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {courses.filter((c) => docs.some((d) => d.courseId === c.id)).map((c) => (
            <Section key={c.id} title={`${c.title} (${docs.filter((d) => d.courseId === c.id).length})`}>
              <Card className="overflow-hidden">
                <DocList
                  docs={docs
                    .filter((d) => d.courseId === c.id)
                    .map((d) => ({
                      ...d,
                      uploaderName: `${d.uploader.name} · ${indexed.get(d.id) ?? 0} passage(s) indexé(s)`,
                      canDelete: true,
                    }))}
                />
              </Card>
            </Section>
          ))}
          {!docs.length && <Empty>La base est vide pour tes cours. Les dépôts des ambassadeurs apparaîtront ici.</Empty>}
        </div>
        {courses.length > 0 && (
          <div>
            <Section title="Ajouter à la base">
              <Card className="p-5">
                <UploadForm courses={courses} mode="ai" defaultKind="CORRECTION" submitLabel="Ajouter à la base de l'IA" />
              </Card>
              <p className="mt-3 text-xs text-faint">
                Utile pour des corrigés ou sujets que tu ne veux pas diffuser aux étudiants mais dont l'IA peut s'inspirer.
              </p>
            </Section>
          </div>
        )}
      </div>
    </>
  );
}
