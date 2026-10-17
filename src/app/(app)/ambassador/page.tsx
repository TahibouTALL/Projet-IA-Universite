import { count, eq } from "drizzle-orm";
import { FileCheck2, HeartHandshake, ShieldCheck, Upload } from "lucide-react";
import { db, schema } from "@/db";
import { requireRole, visibleCourses } from "@/lib/access";
import { plural } from "@/lib/format";
import { DocList } from "@/components/DocList";
import { UploadForm } from "@/components/UploadForm";
import { Empty, PageHeader, Section } from "@/components/ui";

export const maxDuration = 60;
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
        description="Tu aides l'assistant à connaître les cours de l'école. Ce que tu déposes ici n'est pas publié : il sert seulement de contexte à l'IA."
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-8 rounded-3xl border border-line bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Upload size={19} aria-hidden />
              </span>
              <div>
                <h2 className="font-bold text-ink">Déposer un document</h2>
                <p className="text-sm text-muted">Anciens sujets, devoirs, corrigés, polycopiés.</p>
              </div>
            </div>
            {courses.length ? (
              <UploadForm courses={courses} mode="ai" defaultKind="EXAM" submitLabel="Ajouter à la base de l'IA" />
            ) : (
              <p className="text-sm text-muted">Aucun cours n'est encore disponible pour ta classe.</p>
            )}
          </div>

          <Section title="Mes dépôts" action={contributions.length ? <span className="text-sm text-faint">{plural(contributions.length, "document")}</span> : undefined}>
            {contributions.length ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                <DocList showCourse docs={contributions.map((d) => ({ ...d, courseTitle: d.course?.title, canDelete: true }))} />
              </div>
            ) : (
              <Empty icon={HeartHandshake} title="Rien de déposé pour l'instant">
                Ton premier document aidera toute ta classe à mieux réviser.
              </Empty>
            )}
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="board rounded-3xl p-5">
            <p className="text-sm font-bold text-chalk">Ta contribution</p>
            <p className="mt-2 text-[1.6rem] font-bold leading-tight">{plural(contributions.length, "document")}</p>
            <p className="mt-1 text-sm text-white/75">{plural(chunks, "passage", "passages")} que l'assistant peut désormais citer.</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="flex items-center gap-2 font-bold text-ink">
              <FileCheck2 size={17} className="text-accent" aria-hidden />
              Ce qui marche le mieux
            </p>
            <p className="mt-1.5 text-sm text-muted">Les PDF dont on peut sélectionner le texte. Une photo ou un scan ne peut pas encore être lu par l'assistant.</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="flex items-center gap-2 font-bold text-ink">
              <ShieldCheck size={17} className="text-accent" aria-hidden />
              À respecter
            </p>
            <p className="mt-1.5 text-sm text-muted">Ne dépose que des documents que l'établissement autorise à utiliser, sans données personnelles.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
