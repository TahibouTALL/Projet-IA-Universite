import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser, teacherNames, visibleCourses } from "@/lib/access";
import { createCourse } from "@/app/actions/courses";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Empty, Field, Input, Label, PageHeader, Section, Select, Textarea } from "@/components/ui";

export const metadata = { title: "Cours" };

const COLORS = ["#0f766e", "#b45309", "#4338ca", "#be123c", "#15803d", "#0369a1", "#7c3aed", "#57534e"];

export default async function CoursesPage() {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  const canCreate = user.role === "TEACHER" || user.role === "ADMIN";
  const classes = canCreate ? await db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name)) : [];
  const teachers = canCreate
    ? (
        await db
          .select({ id: schema.users.id, name: schema.users.name })
          .from(schema.users)
          .where(eq(schema.users.role, "TEACHER"))
          .orderBy(asc(schema.users.name))
      ).filter((t) => t.id !== user.id)
    : [];

  return (
    <>
      <PageHeader
        title={user.role === "ADMIN" ? "Tous les cours" : "Mes cours"}
        subtitle={`${courses.length} cours`}
      />

      {courses.length ? (
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className="group">
              <Card className="h-full overflow-hidden transition group-hover:border-stone-300 group-hover:shadow-sm">
                <div className="h-2" style={{ background: c.color }} />
                <div className="p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-faint">{c.code || c.classGroup.name}</div>
                  <div className="mt-1 text-lg font-semibold leading-snug">{c.title}</div>
                  {c.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{c.description}</p>}
                  <div className="mt-4 text-sm text-muted">
                    {teacherNames(c)} · {c.classGroup.name}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mb-12">
          <Empty>
            {canCreate ? "Tu n'as pas encore de cours. Crée le premier ci-dessous." : "Aucun cours pour ta classe pour l'instant."}
          </Empty>
        </div>
      )}

      {canCreate && (
        <Section title="Créer un cours">
          <Card className="max-w-2xl p-6">
            {classes.length === 0 ? (
              <p className="text-sm text-muted">L'administration doit d'abord créer au moins une classe.</p>
            ) : (
              <ActionForm action={createCourse} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Field label="Titre">
                      <Input name="title" required placeholder="Résistance des matériaux" />
                    </Field>
                  </div>
                  <Field label="Code" hint="(facultatif)">
                    <Input name="code" placeholder="RDM301" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Classe">
                    <Select name="classGroupId" required defaultValue="">
                      <option value="" disabled>
                        Choisir...
                      </option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Couleur">
                    <ColorPicker />
                  </Field>
                </div>
                {teachers.length > 0 && (
                  <div>
                    <Label hint={user.role === "ADMIN" ? "(sinon tu en es l'enseignant)" : "(facultatif, tu es ajouté automatiquement)"}>
                      {user.role === "ADMIN" ? "Enseignants du cours" : "Co-enseignants"}
                    </Label>
                    <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-line bg-white p-3 sm:grid-cols-2">
                      {teachers.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="teacherIds" value={t.id} /> {t.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <Field label="Description" hint="(facultatif)">
                  <Textarea name="description" className="min-h-16" />
                </Field>
                <SubmitButton>Créer le cours</SubmitButton>
              </ActionForm>
            )}
          </Card>
        </Section>
      )}
    </>
  );
}

function ColorPicker() {
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {COLORS.map((c, i) => (
        <label key={c} className="cursor-pointer">
          <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
          <span
            className="block h-7 w-7 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink"
            style={{ background: c }}
          />
        </label>
      ))}
    </div>
  );
}
