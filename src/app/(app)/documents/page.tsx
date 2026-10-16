import { and, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DocKind } from "@/db/schema";
import { isStudentLike, requireUser, visibleCourses } from "@/lib/access";
import { DOC_KIND_LABELS } from "@/lib/documents";
import { DocList } from "@/components/DocList";
import { UploadForm } from "@/components/UploadForm";
import { btn, Card, Empty, Input, PageHeader, Section, Select } from "@/components/ui";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string; kind?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const courses = await visibleCourses(user);
  const courseIds = courses.map((c) => c.id);
  const manageable = new Set(user.role === "ADMIN" ? courseIds : courses.filter((c) => c.teacherId === user.id).map((c) => c.id));

  const filters: (SQL | undefined)[] = [
    courseIds.length ? inArray(schema.documents.courseId, courseIds) : eq(schema.documents.id, "__none__"),
    or(eq(schema.documents.status, "PUBLISHED"), eq(schema.documents.uploaderId, user.id)),
  ];
  if (sp.course && courseIds.includes(sp.course)) filters.push(eq(schema.documents.courseId, sp.course));
  if (sp.kind && sp.kind in DOC_KIND_LABELS) filters.push(eq(schema.documents.kind, sp.kind as DocKind));
  if (sp.q?.trim()) {
    const q = `%${sp.q.trim()}%`;
    filters.push(or(ilike(schema.documents.title, q), ilike(schema.documents.fileName, q)));
  }

  const docs = await db.query.documents.findMany({
    where: and(...filters),
    with: { uploader: { columns: { name: true } } },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
    limit: 300,
  });

  const byCourse = courses
    .map((c) => ({ course: c, docs: docs.filter((d) => d.courseId === c.id) }))
    .filter((g) => g.docs.length);

  return (
    <>
      <PageHeader title="Documents" subtitle="Tous les supports de tes cours, classés par matière." />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form className="mb-6 flex flex-wrap gap-2">
            <Input name="q" defaultValue={sp.q} placeholder="Rechercher un document..." className="min-w-48 flex-1" />
            <Select name="course" defaultValue={sp.course ?? ""} className="w-auto">
              <option value="">Tous les cours</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Select name="kind" defaultValue={sp.kind ?? ""} className="w-auto">
              <option value="">Tous les types</option>
              {Object.entries(DOC_KIND_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
            <button className={btn.secondary}>Filtrer</button>
          </form>

          {byCourse.length ? (
            byCourse.map(({ course, docs }) => (
              <Section key={course.id} title={course.title}>
                <Card className="overflow-hidden">
                  <DocList
                    docs={docs.map((d) => ({
                      ...d,
                      uploaderName: d.uploader.name,
                      canDelete: d.uploaderId === user.id || manageable.has(course.id),
                    }))}
                  />
                </Card>
              </Section>
            ))
          ) : (
            <Empty>Aucun document ne correspond.</Empty>
          )}
        </div>

        {courses.length > 0 && (
          <div>
            <Section title={isStudentLike(user) ? "Partager avec ma classe" : "Ajouter un document"}>
              <Card className="p-5">
                <UploadForm courses={courses} submitLabel={isStudentLike(user) ? "Partager" : "Ajouter"} />
              </Card>
              {user.role === "AMBASSADOR" && (
                <p className="mt-3 text-sm text-muted">
                  Tu as un sujet d'examen ou une correction officielle ? Passe par l'espace ambassadeur pour qu'il alimente l'IA après validation.
                </p>
              )}
            </Section>
          </div>
        )}
      </div>
    </>
  );
}
