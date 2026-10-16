import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canManageCourse, getViewableCourse, isStudentLike, requireUser, teacherNames } from "@/lib/access";
import { createItem, deleteCourse, deleteItem } from "@/app/actions/courses";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { DocList, type DocRow } from "@/components/DocList";
import { Markdown } from "@/components/Markdown";
import { UploadForm } from "@/components/UploadForm";
import { Badge, ButtonLink, Card, Empty, Field, formatDate, Input, Section, Select, Textarea } from "@/components/ui";

const TYPE_LABEL = { LESSON: "Cours", ASSIGNMENT: "Devoir", ANNOUNCEMENT: "Annonce" } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, (await params).id) });
  return { title: course?.title ?? "Cours" };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const course = await getViewableCourse(user, (await params).id);
  const manager = canManageCourse(user, course);

  const items = await db.query.courseItems.findMany({
    where: eq(schema.courseItems.courseId, course.id),
    with: { author: { columns: { name: true } }, documents: true },
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  // Documents hors publications (les documents réservés à l'IA ne s'affichent jamais ici)
  const docs = await db.query.documents.findMany({
    where: and(
      eq(schema.documents.courseId, course.id),
      eq(schema.documents.status, "PUBLISHED"),
      eq(schema.documents.aiOnly, false),
    ),
    with: { uploader: { columns: { name: true } } },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });
  const loose = docs.filter((d) => !d.itemId);
  const toRow = (d: (typeof docs)[number]): DocRow => ({
    ...d,
    uploaderName: d.uploader.name,
    canDelete: manager || d.uploaderId === user.id,
  });
  const official = loose.filter((d) => d.source === "TEACHER" || d.source === "ADMIN");
  const shared = loose.filter((d) => d.source === "STUDENT");

  return (
    <>
      <div className="mb-8 overflow-hidden rounded-xl text-white" style={{ background: course.color }}>
        <div className="p-6 sm:p-8">
          <div className="text-sm text-white/80">
            {[course.code, course.classGroup.name, teacherNames(course)].filter(Boolean).join(" · ")}
          </div>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{course.title}</h1>
          {course.description && <p className="mt-2 max-w-2xl text-white/85">{course.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={`/ai/chat?course=${course.id}`} variant="secondary">
              Réviser avec l'IA
            </ButtonLink>
            <ButtonLink href={`/ai/exercises?course=${course.id}`} variant="secondary">
              Générer des exercices
            </ButtonLink>
            {manager && (
              <ButtonLink href={`/ai/presentation?course=${course.id}`} variant="secondary">
                Générer une présentation
              </ButtonLink>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {manager && (
            <Section title="Nouvelle publication">
              <Card className="p-5">
                <ActionForm action={createItem} className="space-y-3">
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Type">
                      <Select name="type" defaultValue="LESSON">
                        <option value="LESSON">Cours / support</option>
                        <option value="ASSIGNMENT">Devoir</option>
                        <option value="ANNOUNCEMENT">Annonce du cours</option>
                      </Select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Titre">
                        <Input name="title" required placeholder="Chapitre 2 : Flexion simple" />
                      </Field>
                    </div>
                  </div>
                  <Field label="Contenu" hint="(Markdown et formules $...$ acceptés)">
                    <Textarea name="content" className="min-h-28" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Pièces jointes">
                      <Input name="files" type="file" multiple />
                    </Field>
                    <Field label="Date limite" hint="(devoirs)">
                      <Input name="dueDate" type="datetime-local" />
                    </Field>
                  </div>
                  <SubmitButton pendingText="Publication...">Publier</SubmitButton>
                </ActionForm>
              </Card>
            </Section>
          )}

          <Section title="Publications">
            {items.length ? (
              <div className="space-y-4">
                {items.map((i) => (
                  <Card key={i.id} id={i.id} className="scroll-mt-20 p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone={i.type === "ASSIGNMENT" ? "warn" : i.type === "ANNOUNCEMENT" ? "accent" : "neutral"}>
                        {TYPE_LABEL[i.type]}
                      </Badge>
                      <span className="text-xs text-faint">
                        {i.author.name} · {formatDate(i.createdAt, true)}
                      </span>
                      {i.dueDate && (
                        <span className="text-xs font-medium text-warn">À rendre le {formatDate(i.dueDate, true)}</span>
                      )}
                      {manager && (
                        <form action={deleteItem} className="ml-auto">
                          <input type="hidden" name="itemId" value={i.id} />
                          <ConfirmButton message="Supprimer cette publication et ses pièces jointes ?">Supprimer</ConfirmButton>
                        </form>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">{i.title}</h3>
                    {i.content && (
                      <div className="mt-2">
                        <Markdown>{i.content}</Markdown>
                      </div>
                    )}
                    {i.documents.length > 0 && (
                      <div className="mt-4 overflow-hidden rounded-lg border border-line">
                        <DocList docs={i.documents.map((d) => ({ ...d, canDelete: false }))} />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Empty>Aucune publication pour l'instant.</Empty>
            )}
          </Section>
        </div>

        <div>
          <Section title="Documents du cours">
            {official.length ? (
              <Card className="overflow-hidden">
                <DocList docs={official.map(toRow)} />
              </Card>
            ) : (
              <Empty>Aucun document.</Empty>
            )}
          </Section>

          <Section title="Partagés par les étudiants">
            {shared.length ? (
              <Card className="mb-4 overflow-hidden">
                <DocList docs={shared.map(toRow)} />
              </Card>
            ) : (
              <p className="mb-4 text-sm text-muted">Aucun partage pour l'instant.</p>
            )}
            {(isStudentLike(user) || manager) && (
              <Card className="p-5">
                <div className="mb-3 text-sm font-medium">
                  {manager ? "Ajouter un document au cours" : "Partager un document avec la classe"}
                </div>
                <UploadForm fixedCourseId={course.id} submitLabel={manager ? "Ajouter" : "Partager"} />
              </Card>
            )}
          </Section>

          {manager && (
            <form action={deleteCourse} className="mt-10">
              <input type="hidden" name="courseId" value={course.id} />
              <ConfirmButton message="Supprimer définitivement ce cours, ses publications et ses documents ?" className="text-xs text-danger hover:underline">
                Supprimer le cours
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
