import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isStudentLike, requireUser } from "@/lib/access";
import { addScheduleEntry, deleteScheduleEntry, importSchedule } from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { btn, Card, DAYS, Empty, Field, Input, PageHeader, Section, Select } from "@/components/ui";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

export const metadata = { title: "Emploi du temps" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const classes = await db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name));
  const isAdmin = user.role === "ADMIN";

  const classId = isStudentLike(user) ? user.classGroupId : sp.class || classes[0]?.id || null;
  const current = classes.find((c) => c.id === classId);
  const entries = classId
    ? await db.query.scheduleEntries.findMany({
        where: eq(schema.scheduleEntries.classGroupId, classId),
        orderBy: (s, { asc }) => [asc(s.dayOfWeek), asc(s.startTime)],
      })
    : [];
  const courses = isAdmin && classId ? await db.query.courses.findMany({ where: eq(schema.courses.classGroupId, classId) }) : [];

  return (
    <>
      <PageHeader
        title="Emploi du temps"
        subtitle={current?.name ?? (isStudentLike(user) ? "Aucune classe associée à ton compte" : "Aucune classe")}
        actions={
          !isStudentLike(user) && classes.length > 0 ? (
            <form className="flex gap-2">
              <Select name="class" defaultValue={classId ?? ""} className="w-auto">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <button className={btn.secondary}>Afficher</button>
            </form>
          ) : undefined
        }
      />

      {entries.length ? (
        <div className="mb-10 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((d) => {
            const list = entries.filter((e) => e.dayOfWeek === d);
            return (
              <div key={d}>
                <div className="mb-2 text-sm font-semibold">{DAYS[d]}</div>
                <div className="space-y-2">
                  {list.length ? (
                    list.map((e) => (
                      <Card key={e.id} className="border-l-4 p-3" style={{ borderLeftColor: "var(--color-accent)" }}>
                        <div className="text-xs font-medium tabular-nums text-muted">
                          {e.startTime} – {e.endTime}
                        </div>
                        <div className="mt-0.5 text-sm font-medium leading-snug">{e.title}</div>
                        <div className="mt-0.5 text-xs text-muted">{[e.room, e.teacherName].filter(Boolean).join(" · ")}</div>
                        {isAdmin && (
                          <form action={deleteScheduleEntry} className="mt-1">
                            <input type="hidden" name="id" value={e.id} />
                            <ConfirmButton message="Supprimer ce créneau ?" className="text-xs text-faint hover:text-danger">
                              Retirer
                            </ConfirmButton>
                          </form>
                        )}
                      </Card>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-line p-3 text-xs text-faint">Libre</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-10">
          <Empty>Aucun créneau enregistré pour cette classe.</Empty>
        </div>
      )}

      {isAdmin && classId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Ajouter un créneau">
            <Card className="p-5">
              <ActionForm action={addScheduleEntry} className="space-y-3">
                <input type="hidden" name="classGroupId" value={classId} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cours">
                    <Select name="courseId" defaultValue="">
                      <option value="">Autre (préciser)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Intitulé" hint="(si autre)">
                    <Input name="title" placeholder="Conférence, examen..." />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Jour">
                    <Select name="dayOfWeek" defaultValue="1">
                      {[1, 2, 3, 4, 5, 6].map((d) => (
                        <option key={d} value={d}>
                          {DAYS[d]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Début">
                    <Input name="startTime" type="time" required defaultValue="08:00" />
                  </Field>
                  <Field label="Fin">
                    <Input name="endTime" type="time" required defaultValue="10:00" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Salle">
                    <Input name="room" />
                  </Field>
                  <Field label="Enseignant" hint="(auto si cours)">
                    <Input name="teacherName" />
                  </Field>
                </div>
                <SubmitButton>Ajouter</SubmitButton>
              </ActionForm>
            </Card>
          </Section>

          <Section title="Importer un fichier CSV">
            <Card className="p-5">
              <p className="mb-3 text-sm text-muted">
                Une ligne par créneau : <code className="break-all rounded bg-stone-100 px-1">jour;début;fin;intitulé;salle;enseignant</code>.
                Exemple : <code className="break-all rounded bg-stone-100 px-1">Lundi;08:00;10:00;Résistance des matériaux;Amphi A;Awa Diop</code>.
                L'intitulé est relié au cours s'il correspond à son titre ou à son code. Un export Excel en CSV convient.
              </p>
              <ActionForm action={importSchedule} className="space-y-3">
                <input type="hidden" name="classGroupId" value={classId} />
                <Input name="file" type="file" accept=".csv,text/csv" required />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="replace" /> Remplacer l'emploi du temps actuel de la classe
                </label>
                <SubmitButton variant="secondary">Importer</SubmitButton>
              </ActionForm>
            </Card>
          </Section>
        </div>
      )}
    </>
  );
}
