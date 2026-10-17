import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { CalendarPlus, FileSpreadsheet } from "lucide-react";
import { db, schema } from "@/db";
import { isStudentLike, requireUser } from "@/lib/access";
import { DAYS, nowInDakar } from "@/lib/format";
import { addScheduleEntry, importSchedule } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { WeekSchedule } from "@/components/WeekSchedule";
import { Disclosure, Empty, Field, Input, PageHeader, Select, cx } from "@/components/ui";

export const metadata = { title: "Emploi du temps" };

/** Dates (jour et mois) du lundi au samedi de la semaine affichée ; le dimanche, on montre la semaine suivante. */
function weekDates(dow: number) {
  const now = new Date();
  const offset = dow === 7 ? 1 : 1 - dow;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Dakar" });
  return Array.from({ length: 6 }, (_, i) => fmt.format(new Date(monday.getTime() + i * 86400000)));
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const classes = await db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name));
  const isAdmin = user.role === "ADMIN";
  const learner = isStudentLike(user);

  const classId = learner ? user.classGroupId : sp.class || classes[0]?.id || null;
  const current = classes.find((c) => c.id === classId);
  const entries = classId
    ? await db.query.scheduleEntries.findMany({
        where: eq(schema.scheduleEntries.classGroupId, classId),
        with: { course: { columns: { color: true } } },
      })
    : [];
  const courses = isAdmin && classId ? await db.query.courses.findMany({ where: eq(schema.courses.classGroupId, classId) }) : [];
  const now = nowInDakar();

  return (
    <>
      <PageHeader
        title="Emploi du temps"
        description={current ? current.name : learner ? "Ton compte n'est rattaché à aucune classe pour l'instant." : undefined}
      />

      {!learner && classes.length > 1 && (
        <nav aria-label="Classe" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {classes.map((c) => {
            const on = c.id === classId;
            return (
              <Link
                key={c.id}
                href={`/schedule?class=${c.id}`}
                aria-current={on ? "true" : undefined}
                className={cx(
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  on ? "border-accent bg-accent-soft text-accent-strong" : "border-line-strong bg-white text-muted hover:text-ink",
                )}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>
      )}

      {classId ? (
        entries.length ? (
          <WeekSchedule
            slots={entries.map((e) => ({
              id: e.id,
              dayOfWeek: e.dayOfWeek,
              startTime: e.startTime,
              endTime: e.endTime,
              title: e.title,
              room: e.room,
              teacherName: e.teacherName,
              color: e.course?.color ?? "#616d68",
            }))}
            today={now.dow}
            nowHm={now.hm}
            dates={weekDates(now.dow)}
            canEdit={isAdmin}
          />
        ) : (
          <Empty icon={CalendarPlus} title="Pas encore d'emploi du temps">
            {isAdmin ? "Ajoute des créneaux ou importe un fichier ci-dessous." : "L'emploi du temps de cette classe n'est pas encore en ligne."}
          </Empty>
        )
      ) : (
        <Empty icon={CalendarPlus} title={isAdmin ? "Aucune classe" : "Pas de classe"}>
          {isAdmin ? (
            <>
              Crée d'abord une classe dans{" "}
              <Link href="/admin?tab=classes" className="font-bold text-accent underline">
                l'administration
              </Link>
              .
            </>
          ) : (
            "Demande à l'administration de t'ajouter à ta classe."
          )}
        </Empty>
      )}

      {isAdmin && classId && (
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Disclosure summary="Ajouter un créneau" hint={current?.name} icon={CalendarPlus} open={entries.length === 0}>
            <ActionForm action={addScheduleEntry} className="space-y-4">
              <input type="hidden" name="classGroupId" value={classId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cours">
                  <Select name="courseId" defaultValue="">
                    <option value="">Autre (à préciser)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Intitulé" hint="si autre">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Salle">
                  <Input name="room" placeholder="Amphi A" />
                </Field>
                <Field label="Enseignant" hint="rempli d'après le cours">
                  <Input name="teacherName" />
                </Field>
              </div>
              <SubmitButton icon={<CalendarPlus />}>Ajouter</SubmitButton>
            </ActionForm>
          </Disclosure>

          <Disclosure summary="Importer un fichier CSV" hint="Depuis Excel : Enregistrer sous, format CSV" icon={FileSpreadsheet}>
            <div className="mb-4 space-y-2 text-sm text-muted">
              <p>Une ligne par créneau, dans cet ordre : jour, début, fin, intitulé, salle, enseignant. Séparateur point-virgule ou virgule.</p>
              <pre className="overflow-x-auto rounded-lg bg-paper px-3 py-2 text-[13px] text-ink">Lundi;08:00;10:00;Résistance des matériaux;Amphi A;Awa Diop</pre>
              <p>L'intitulé est relié au cours s'il correspond à son nom ou à son code.</p>
            </div>
            <ActionForm action={importSchedule} className="space-y-4">
              <input type="hidden" name="classGroupId" value={classId} />
              <Input name="file" type="file" accept=".csv,text/csv" required className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:font-bold file:text-accent-strong" />
              <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                <input type="checkbox" name="replace" className="h-4 w-4 accent-[var(--color-accent)]" />
                Remplacer l'emploi du temps actuel de la classe
              </label>
              <SubmitButton variant="secondary" icon={<FileSpreadsheet />}>
                Importer
              </SubmitButton>
            </ActionForm>
          </Disclosure>
        </div>
      )}
    </>
  );
}
