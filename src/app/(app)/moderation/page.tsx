import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/access";
import { DOC_KIND_LABELS } from "@/lib/documents";
import { reviewDocument } from "@/app/actions/courses";
import { Card, Empty, formatDate, formatSize, Input, PageHeader, Select, btn, cx } from "@/components/ui";

export const metadata = { title: "Contributions" };

export default async function ModerationPage() {
  const user = await requireRole("ADMIN", "TEACHER");
  const courseFilter =
    user.role === "TEACHER"
      ? inArray(
          schema.documents.courseId,
          db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.teacherId, user.id)),
        )
      : undefined;
  const pending = await db.query.documents.findMany({
    where: and(eq(schema.documents.status, "PENDING"), courseFilter),
    with: { uploader: { columns: { name: true } }, course: { columns: { title: true } } },
    orderBy: (d, { asc }) => [asc(d.createdAt)],
  });

  return (
    <>
      <PageHeader
        title="Contributions des ambassadeurs"
        subtitle="Les documents validés deviennent visibles par la classe et enrichissent les réponses de l'IA."
      />
      {pending.length ? (
        <div className="space-y-3">
          {pending.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={`/api/files/${d.id}`} target="_blank" className="font-medium hover:text-accent">
                    {d.title}
                  </a>
                  <div className="text-sm text-muted">
                    {[d.course?.title, DOC_KIND_LABELS[d.kind], d.academicYear, d.uploader.name, formatDate(d.createdAt), formatSize(d.size)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {d.description && <p className="mt-2 text-sm">{d.description}</p>}
                </div>
                <a href={`/api/files/${d.id}`} target="_blank" className={btn.secondary}>
                  Ouvrir
                </a>
              </div>
              <form action={reviewDocument} className="mt-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="documentId" value={d.id} />
                <Select name="kind" defaultValue={d.kind} className="w-auto py-1.5">
                  {Object.entries(DOC_KIND_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
                <Input name="note" placeholder="Note pour l'ambassadeur (facultatif)" className="min-w-48 flex-1 py-1.5" />
                <button name="decision" value="approve" className={cx(btn.primary, "py-1.5")}>
                  Valider
                </button>
                <button name="decision" value="reject" className={cx(btn.danger, "py-1.5")}>
                  Refuser
                </button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>Aucune contribution en attente.</Empty>
      )}
    </>
  );
}
