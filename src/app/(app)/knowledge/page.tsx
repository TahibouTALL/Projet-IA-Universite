import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { CircleAlert, EyeOff, Library, Upload } from "lucide-react";
import { db, schema } from "@/db";
import { requireRole, visibleCourses } from "@/lib/access";
import { plural } from "@/lib/format";
import { DocList } from "@/components/DocList";
import { UploadForm } from "@/components/UploadForm";
import { CourseDot, Disclosure, Empty, PageHeader } from "@/components/ui";

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
  const groups = courses.map((c) => ({ course: c, docs: docs.filter((d) => d.courseId === c.id) })).filter((g) => g.docs.length);

  return (
    <>
      <PageHeader
        title="Base de l'IA"
        description="Les documents qui servent seulement de contexte à l'assistant : anciens sujets, corrigés, polycopiés déposés par les ambassadeurs et les enseignants."
      />

      <div className="max-w-3xl">
        <p className="mb-6 flex items-start gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm text-muted ring-1 ring-line">
          <EyeOff size={17} className="mt-px shrink-0 text-accent" aria-hidden />
          Les étudiants ne voient jamais ces documents. L'assistant s'en inspire pour répondre au niveau et dans le style de l'école.
        </p>

        {unreadable.length > 0 && (
          <p className="mb-6 flex items-start gap-2.5 rounded-2xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
            <CircleAlert size={17} className="mt-px shrink-0" aria-hidden />
            {plural(unreadable.length, "document")} sans texte lisible (scan ou photo) : l'assistant ne peut pas encore {unreadable.length > 1 ? "les" : "le"} lire. Un PDF dont on peut sélectionner le texte fonctionne mieux.
          </p>
        )}

        {courses.length > 0 && (
          <Disclosure summary="Ajouter un document à la base" hint="Un corrigé ou un sujet à ne pas diffuser" icon={Upload} className="mb-8" open={docs.length === 0}>
            <UploadForm courses={courses} mode="ai" defaultKind="CORRECTION" submitLabel="Ajouter à la base de l'IA" />
          </Disclosure>
        )}

        {groups.length ? (
          <div className="space-y-8">
            {groups.map(({ course, docs }) => (
              <section key={course.id}>
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <h2 className="flex min-w-0 items-center gap-2.5 text-[1.0625rem] font-bold">
                    <CourseDot color={course.color} />
                    <Link href={`/courses/${course.id}`} className="truncate hover:text-accent">
                      {course.title}
                    </Link>
                  </h2>
                  <span className="shrink-0 text-sm text-faint">{plural(docs.length, "document")}</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <DocList
                    docs={docs.map((d) => ({
                      ...d,
                      uploaderName: d.uploader.name,
                      extra: indexed.get(d.id) ? plural(indexed.get(d.id)!, "passage lu", "passages lus") : "texte illisible",
                      canDelete: true,
                    }))}
                  />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Empty icon={Library} title="La base est vide pour tes cours">
            Les documents déposés par les ambassadeurs apparaîtront ici. Tu peux aussi en ajouter toi-même.
          </Empty>
        )}
      </div>
    </>
  );
}
