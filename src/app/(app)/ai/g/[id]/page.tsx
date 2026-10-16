import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { canManageCourse, requireUser, visibleCourses } from "@/lib/access";
import type { Deck } from "@/lib/ai/generate";
import { aiIsSimulated } from "@/lib/ai/provider";
import { deleteGeneration, publishGeneration } from "@/app/actions/ai";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { btn, ButtonLink, Card, formatDate, PageHeader, Section, Select } from "@/components/ui";

const TYPE_LABEL = { COURSE: "Cours généré", EXERCISES: "Exercices générés", PRESENTATION: "Présentation générée" } as const;

export default async function GenerationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const g = await db.query.generations.findFirst({
    where: and(eq(schema.generations.id, (await params).id), eq(schema.generations.userId, user.id)),
    with: { course: { columns: { title: true } } },
  });
  if (!g) notFound();
  const staff = user.role === "TEACHER" || user.role === "ADMIN";
  const myCourses = staff ? (await visibleCourses(user)).filter((c) => canManageCourse(user, c)) : [];
  const sources = ((g.params as { sources?: string[] } | null)?.sources ?? []).filter((v, i, a) => a.indexOf(v) === i);
  const deck = g.type === "PRESENTATION" ? (JSON.parse(g.content) as Deck) : null;

  return (
    <>
      <PageHeader
        title={g.topic}
        subtitle={`${TYPE_LABEL[g.type]} · ${formatDate(g.createdAt, true)}${g.course ? ` · ${g.course.title}` : ""}`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            {deck ? (
              <a href={`/api/generations/${g.id}/pptx`} className={btn.primary}>
                Télécharger le PowerPoint
              </a>
            ) : (
              <PrintButton />
            )}
            <ButtonLink href={g.type === "PRESENTATION" ? "/ai/presentation" : g.type === "EXERCISES" ? "/ai/exercises" : "/ai/course"} variant="secondary">
              Nouvelle génération
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {(aiIsSimulated || sources.length === 0) && (
            <p className="no-print mb-4 text-sm text-muted">
              {aiIsSimulated
                ? "Contenu simulé (aucun fournisseur IA configuré)."
                : "Aucun document de l'établissement ne correspondait : ce contenu repose sur les connaissances générales du modèle. Vérifie-le avant de l'utiliser."}
            </p>
          )}

          {deck ? (
            <div className="space-y-4">
              <Card className="p-8">
                <div className="text-2xl font-semibold">{deck.title}</div>
                {deck.subtitle && <div className="mt-1 text-muted">{deck.subtitle}</div>}
              </Card>
              {deck.slides.map((s, i) => (
                <Card key={i} className="p-6">
                  <div className="mb-1 text-xs text-faint">Diapositive {i + 2}</div>
                  <div className="text-lg font-semibold">{s.title}</div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    {s.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                  {s.notes && <p className="mt-3 border-t border-line pt-3 text-xs text-muted">Notes : {s.notes}</p>}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 sm:p-8">
              <Markdown>{g.content}</Markdown>
              {g.solution && (
                <details className="mt-8 border-t border-line pt-6">
                  <summary className="cursor-pointer select-none font-semibold text-accent">Afficher la correction</summary>
                  <div className="mt-4">
                    <Markdown>{g.solution}</Markdown>
                  </div>
                </details>
              )}
            </Card>
          )}
        </div>

        <div className="no-print">
          {sources.length > 0 && (
            <Section title="Documents utilisés">
              <ul className="space-y-1 text-sm text-muted">
                {sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Section>
          )}
          {staff && myCourses.length > 0 && (
            <Section title="Publier dans un cours">
              <Card className="p-4">
                <ActionForm action={publishGeneration} className="space-y-3">
                  <input type="hidden" name="id" value={g.id} />
                  <Select name="courseId" required defaultValue={g.courseId ?? ""}>
                    <option value="" disabled>
                      Choisir le cours...
                    </option>
                    {myCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                  {g.type === "EXERCISES" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="withSolution" /> Inclure la correction
                    </label>
                  )}
                  <SubmitButton variant="secondary" pendingText="Publication...">
                    Publier
                  </SubmitButton>
                </ActionForm>
                <p className="mt-2 text-xs text-faint">Relis le contenu avant de le publier.</p>
              </Card>
            </Section>
          )}
          <form action={deleteGeneration}>
            <input type="hidden" name="id" value={g.id} />
            <ConfirmButton message="Supprimer ce contenu ?">Supprimer</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
