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
  const [{ n: chunks }] = await db
    .select({ n: count() })
    .from(schema.documentChunks)
    .innerJoin(schema.documents, eq(schema.documents.id, schema.documentChunks.documentId))
    .where(eq(schema.documents.uploaderId, user.id));
  const published = mine.filter((d) => d.status === "PUBLISHED").length;

  return (
    <>
      <PageHeader
        title="Espace ambassadeur"
        subtitle="Dépose les documents de l'établissement : anciens sujets, devoirs, corrections, polycopiés. Après validation par l'enseignant, ils rendent l'IA plus précise pour toute la classe."
      />
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-semibold">{mine.length}</div>
          <div className="text-sm text-muted">Contributions</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold">{published}</div>
          <div className="text-sm text-muted">Validées</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold">{chunks}</div>
          <div className="text-sm text-muted">Passages indexés pour l'IA</div>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Mes contributions">
            {mine.length ? (
              <Card className="overflow-hidden">
                <DocList
                  showCourse
                  docs={mine.map((d) => ({ ...d, courseTitle: d.course?.title, canDelete: d.status !== "PUBLISHED" }))}
                />
              </Card>
            ) : (
              <Empty>Tu n'as encore rien déposé.</Empty>
            )}
            {mine.some((d) => d.status === "REJECTED" && d.reviewNote) && (
              <div className="mt-4 space-y-2">
                {mine
                  .filter((d) => d.status === "REJECTED" && d.reviewNote)
                  .map((d) => (
                    <p key={d.id} className="text-sm text-muted">
                      <span className="font-medium text-ink">{d.title}</span> : {d.reviewNote}
                    </p>
                  ))}
              </div>
            )}
          </Section>
        </div>
        <div>
          <Section title="Nouvelle contribution">
            <Card className="p-5">
              {courses.length ? (
                <UploadForm courses={courses} mode="contribution" defaultKind="EXAM" submitLabel="Envoyer pour validation" />
              ) : (
                <p className="text-sm text-muted">Aucun cours disponible pour ta classe.</p>
              )}
            </Card>
            <p className="mt-3 text-xs text-faint">
              Ne dépose que des documents que l'établissement autorise à partager. Les PDF contenant du texte (pas des scans) sont les plus utiles à l'IA.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
