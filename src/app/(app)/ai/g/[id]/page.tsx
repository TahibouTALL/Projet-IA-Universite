import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CircleAlert, Download, Eye, FileText, RefreshCw, Send, Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { canManageCourse, requireUser, visibleCourses } from "@/lib/access";
import type { Deck } from "@/lib/ai/generate";
import { aiIsSimulated } from "@/lib/ai/provider";
import { formatDate, formatTime } from "@/lib/format";
import { deleteGeneration, publishGeneration } from "@/app/actions/ai";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { Badge, button, ButtonLink, PageHeader, Select } from "@/components/ui";

// Génération IA : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

const TYPE_LABEL = { COURSE: "Cours", EXERCISES: "Exercices", PRESENTATION: "Présentation" } as const;
const AGAIN = { COURSE: "/ai/course", EXERCISES: "/ai/exercises", PRESENTATION: "/ai/presentation" } as const;

export default async function GenerationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const g = await db.query.generations.findFirst({
    where: and(eq(schema.generations.id, (await params).id), eq(schema.generations.userId, user.id)),
    with: { course: { columns: { id: true, title: true } } },
  });
  if (!g) notFound();
  const staff = user.role === "TEACHER" || user.role === "ADMIN";
  const myCourses = staff ? (await visibleCourses(user)).filter((c) => canManageCourse(user, c)) : [];
  const sources = ((g.params as { sources?: string[] } | null)?.sources ?? []).filter((v, i, a) => a.indexOf(v) === i);
  const deck = g.type === "PRESENTATION" ? (JSON.parse(g.content) as Deck) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/ai", label: "Assistant IA" }}
        title={g.topic}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone="accent">{TYPE_LABEL[g.type]}</Badge>
            <span>
              Généré le {formatDate(g.createdAt)} à {formatTime(g.createdAt)}
              {g.course ? `, pour ${g.course.title}` : ""}
            </span>
          </span>
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            {deck ? (
              <a href={`/api/generations/${g.id}/pptx`} className={button("primary")}>
                <Download size={17} aria-hidden />
                Télécharger le PowerPoint
              </a>
            ) : (
              <PrintButton />
            )}
            <ButtonLink href={AGAIN[g.type]} variant="secondary" icon={RefreshCw}>
              Nouvelle génération
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_288px]">
        <div className="min-w-0">
          {(aiIsSimulated || sources.length === 0) && (
            <p className="no-print mb-4 flex items-start gap-2 rounded-2xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
              <CircleAlert size={17} className="mt-px shrink-0" aria-hidden />
              {aiIsSimulated
                ? "Contenu de démonstration : aucun service d'IA n'est encore branché."
                : "Aucun document de tes cours ne correspondait : ce contenu vient des connaissances générales de l'IA. Relis-le avant de t'en servir."}
            </p>
          )}

          {deck ? (
            <ol className="grid gap-4 sm:grid-cols-2">
              <li className="sm:col-span-2">
                <SlideFrame n={1}>
                  <div className="flex h-full items-center gap-5">
                    <span className="h-1/2 w-1.5 rounded-full bg-accent" />
                    <div>
                      <p className="text-[clamp(1.25rem,3vw,1.9rem)] font-bold leading-tight text-ink">{deck.title}</p>
                      {deck.subtitle && <p className="mt-1.5 text-md text-muted">{deck.subtitle}</p>}
                    </div>
                  </div>
                </SlideFrame>
              </li>
              {deck.slides.map((s, i) => (
                <li key={i}>
                  <SlideFrame n={i + 2}>
                    <p className="font-bold leading-snug text-ink">{s.title}</p>
                    <span className="mt-1.5 block h-0.5 w-8 rounded-full bg-accent" />
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-[13px] leading-snug text-ink marker:text-faint">
                      {s.points.map((p, j) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  </SlideFrame>
                  {s.notes && <p className="mt-2 px-1 text-xs text-muted">Notes : {s.notes}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <>
              <article className="rounded-3xl border border-line bg-white px-5 py-7 sm:px-10 sm:py-10">
                <Markdown>{g.content}</Markdown>
              </article>
              {g.solution && (
                <details className="group mt-4 rounded-3xl border border-line bg-white">
                  <summary className="flex cursor-pointer items-center gap-3 rounded-3xl px-5 py-4 hover:bg-paper/60 sm:px-10">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chalk text-ink">
                      <Eye size={18} aria-hidden />
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold text-ink group-open:hidden">Afficher la correction</span>
                      <span className="hidden font-bold text-ink group-open:block">Correction</span>
                      <span className="block text-sm text-muted group-open:hidden">Essaie d'abord de résoudre les exercices.</span>
                    </span>
                  </summary>
                  <div className="border-t border-line px-5 py-7 sm:px-10 sm:py-9">
                    <Markdown>{g.solution}</Markdown>
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        <aside className="no-print space-y-4">
          {staff && myCourses.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="font-bold text-ink">Publier dans un cours</p>
              <p className="mb-3 mt-0.5 text-sm text-muted">Relis le contenu avant : il sera visible par la classe.</p>
              <ActionForm action={publishGeneration} className="space-y-3">
                <input type="hidden" name="id" value={g.id} />
                <Select name="courseId" required defaultValue={g.courseId ?? ""} aria-label="Cours">
                  <option value="" disabled>
                    Choisir le cours
                  </option>
                  {myCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
                {g.type === "EXERCISES" && (
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                    <input type="checkbox" name="withSolution" className="h-4 w-4 accent-[var(--color-accent)]" />
                    Inclure la correction
                  </label>
                )}
                <SubmitButton variant="secondary" icon={<Send />} pendingText="Publication...">
                  Publier
                </SubmitButton>
              </ActionForm>
            </div>
          )}
          {sources.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-2 font-bold text-ink">Documents utilisés</p>
              <ul className="space-y-1.5">
                {sources.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-muted">
                    <FileText size={15} className="mt-0.5 shrink-0 text-faint" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form action={deleteGeneration}>
            <input type="hidden" name="id" value={g.id} />
            <ConfirmButton message="Supprimer ce contenu ?" className="inline-flex items-center gap-2 px-1 text-sm font-bold text-faint hover:text-danger">
              <Trash2 size={15} aria-hidden />
              Supprimer
            </ConfirmButton>
          </form>
        </aside>
      </div>
    </>
  );
}

function SlideFrame({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-white p-[5%] shadow-[0_2px_10px_-6px_rgb(18_51_43/0.3)]">
      {children}
      <span className="absolute bottom-2 right-3 text-[11px] text-faint">{n}</span>
    </div>
  );
}
