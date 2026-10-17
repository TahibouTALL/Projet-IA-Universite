import Link from "next/link";
import { and, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { FileSearch, Search, Upload } from "lucide-react";
import { db, schema } from "@/db";
import type { DocKind } from "@/db/schema";
import { canManageCourse, isStudentLike, requireUser, visibleCourses } from "@/lib/access";
import { DOC_KIND_LABELS } from "@/lib/documents";
import { plural } from "@/lib/format";
import { DocList } from "@/components/DocList";
import { UploadForm } from "@/components/UploadForm";
import { button, CourseDot, Disclosure, Empty, Input, PageHeader, Select, cx } from "@/components/ui";

export const maxDuration = 60;
export const metadata = { title: "Documents" };

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Tout" },
  { key: "COURSE", label: "Cours" },
  { key: "TD", label: "TD" },
  { key: "TP", label: "TP" },
  { key: "EXAM", label: "Examens" },
  { key: "CORRECTION", label: "Corrections" },
  { key: "HOMEWORK", label: "Devoirs" },
  { key: "SUMMARY", label: "Fiches" },
  { key: "OTHER", label: "Autres" },
];

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string; kind?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const courses = await visibleCourses(user);
  const courseIds = courses.map((c) => c.id);
  const manageable = new Set(courses.filter((c) => canManageCourse(user, c)).map((c) => c.id));
  const learner = isStudentLike(user);

  const filters: (SQL | undefined)[] = [
    courseIds.length ? inArray(schema.documents.courseId, courseIds) : eq(schema.documents.id, "__none__"),
    eq(schema.documents.status, "PUBLISHED"),
    eq(schema.documents.aiOnly, false),
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

  const byCourse = courses.map((c) => ({ course: c, docs: docs.filter((d) => d.courseId === c.id) })).filter((g) => g.docs.length);
  const filtered = !!(sp.q?.trim() || sp.course || sp.kind);
  const hrefWith = (kind: string) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.course) p.set("course", sp.course);
    if (kind) p.set("kind", kind);
    const s = p.toString();
    return s ? `/documents?${s}` : "/documents";
  };

  return (
    <>
      <PageHeader
        title="Documents"
        description={learner ? "Tous les supports de tes cours, rangés par matière." : "Les documents de tes cours, rangés par matière."}
      />

      {courses.length > 0 && (
        <Disclosure
          summary={learner ? "Partager un document avec ma classe" : "Ajouter un document"}
          hint={learner ? "Une fiche, des notes, un TD corrigé..." : undefined}
          icon={Upload}
          className="mb-6"
        >
          <UploadForm courses={courses} submitLabel={learner ? "Partager" : "Ajouter"} defaultKind={learner ? "SUMMARY" : "COURSE"} />
          {user.role === "AMBASSADOR" && (
            <p className="mt-4 text-sm text-muted">
              Un sujet d'examen ou une correction qui doit seulement servir à l'IA ? Dépose-le dans{" "}
              <Link href="/ambassador" className="font-bold text-accent underline">
                l'espace ambassadeur
              </Link>
              .
            </p>
          )}
        </Disclosure>
      )}

      <form className="mb-3 flex flex-col gap-2 sm:flex-row">
        {sp.kind && <input type="hidden" name="kind" value={sp.kind} />}
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
          <Input name="q" defaultValue={sp.q} placeholder="Rechercher un document" className="pl-9" aria-label="Rechercher un document" />
        </div>
        <div className="flex gap-2">
          <Select name="course" defaultValue={sp.course ?? ""} className="min-w-0 flex-1 sm:w-60 sm:flex-none" aria-label="Cours">
            <option value="">Tous les cours</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
          <button className={button("secondary") + " h-11 sm:h-10"}>Rechercher</button>
        </div>
      </form>

      <nav aria-label="Type de document" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => {
          const on = (sp.kind ?? "") === f.key;
          return (
            <Link
              key={f.key}
              href={hrefWith(f.key)}
              aria-current={on ? "true" : undefined}
              className={cx(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors",
                on ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong bg-white text-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {byCourse.length ? (
        <div className="space-y-8">
          {byCourse.map(({ course, docs }) => (
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
                    canDelete: d.uploaderId === user.id || manageable.has(course.id),
                  }))}
                />
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Empty
          icon={FileSearch}
          title={filtered ? "Aucun document ne correspond" : "Pas encore de document"}
          action={
            filtered ? (
              <Link href="/documents" className={button("secondary", "sm")}>
                Effacer la recherche
              </Link>
            ) : undefined
          }
        >
          {filtered ? "Essaie un autre mot ou un autre type de document." : "Les documents déposés dans tes cours apparaîtront ici."}
        </Empty>
      )}
    </>
  );
}
