import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole, visibleCourses } from "@/lib/access";
import { DocList } from "@/components/DocList";
import { UploadForm } from "@/components/UploadForm";
import { Card, Empty, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Espace ambassadeur" };

export default async function AmbassadorPage() {
  const user = await requireRole("AMBASSADOR", "ADMIN");
  const courses = await visibleCourses(user);
  const mine = await db.query.documents.findMany({
    where: eq(schema.documents.uploaderId, user.id),
    with: { course: { columns: { title: true } } },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });
  const contributions = mine.filter((d) => d.aiOnly);
  const [{ n: chunks }] = await db
    .select({ n: count() })
    .from(schema.documentChunks)
    .innerJoin(schema.documents, eq(schema.documents.id, schema.documentChunks.documentId))
    .where(eq(schema.documents.uploaderId, user.id));

  return (
    <>
      <PageHeader
        title="Espace ambassadeur"
        subtitle="Dépose les documents de l'établissement : anciens sujets, devoirs, corrections, polycopiés. Ils ne sont pas publiés : ils servent uniquement de contexte à l'IA, pour qu'elle colle au programme et au niveau réel de l'école."
      />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:max-w-md">
        <Card className="p-4">
          <div className="text-2xl font-semibold">{contributions.length}</div>
          <div className="text-sm text-muted">Documents déposés</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold">{chunks}</div>
          <div className="text-sm text-muted">Passages lus par l'IA</div>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Mes dépôts">
            {contributions.length ? (
              <Card className="overflow-hidden">
                <DocList showCourse docs={contributions.map((d) => ({ ...d, courseTitle: d.course?.title, canDelete: true }))} />
              </Card>
            ) : (
              <Empty>Tu n'as encore rien déposé.</Empty>
            )}
          </Section>
        </div>
        <div>
          <Section title="Nouveau dépôt">
            <Card className="p-5">
              {courses.length ? (
                <UploadForm courses={courses} mode="ai" defaultKind="EXAM" submitLabel="Ajouter à la base de l'IA" />
              ) : (
                <p className="text-sm text-muted">Aucun cours disponible pour ta classe.</p>
              )}
            </Card>
            <p className="mt-3 text-xs text-faint">
              Ne dépose que des documents que l'établissement autorise à utiliser. Les PDF avec du texte sélectionnable (pas des scans photo) sont ceux que l'IA exploite le mieux.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
