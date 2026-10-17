import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { BookOpen, FileText, MessagesSquare, Plus } from "lucide-react";
import { db, schema } from "@/db";
import { isStudentLike, requireUser, visibleCourses } from "@/lib/access";
import { plural } from "@/lib/format";
import { courseCounts } from "@/lib/stats";
import { createCourse } from "@/app/actions/courses";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Disclosure, Empty, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

export const metadata = { title: "Cours" };

const COLORS = ["#0f766e", "#b45309", "#4338ca", "#be123c", "#15803d", "#0369a1", "#7c3aed", "#57534e"];

export default async function CoursesPage() {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  const counts = await courseCounts(courses.map((c) => c.id));
  const canCreate = user.role === "TEACHER" || user.role === "ADMIN";
  const classes = canCreate ? await db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name)) : [];
  const teachers =
    user.role === "ADMIN"
      ? await db
          .select({ id: schema.users.id, name: schema.users.name })
          .from(schema.users)
          .where(eq(schema.users.role, "TEACHER"))
          .orderBy(asc(schema.users.name))
      : [];
  const recentLimit = Date.now() - 3 * 86400000;

  const description = isStudentLike(user)
    ? courses.length
      ? `Les ${plural(courses.length, "cours", "cours")} de ta classe, avec leurs supports, devoirs et documents.`
      : undefined
    : user.role === "ADMIN"
      ? `${plural(courses.length, "cours", "cours")} dans l'établissement.`
      : "Les cours dont tu es l'enseignant.";

  return (
    <>
      <PageHeader title={user.role === "ADMIN" ? "Cours" : "Mes cours"} description={description} />

      {canCreate && (
        <Disclosure summary="Créer un cours" hint="Un espace pour publier supports, devoirs et documents" icon={Plus} open={courses.length === 0} className="mb-8">
          {classes.length === 0 ? (
            <p className="text-sm text-muted">
              Il faut d'abord au moins une classe.{" "}
              {user.role === "ADMIN" ? (
                <Link href="/admin?tab=classes" className="font-bold text-accent underline">
                  Créer une classe
                </Link>
              ) : (
                "Demande à l'administration de la créer."
              )}
            </p>
          ) : (
            <ActionForm action={createCourse} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field label="Nom du cours">
                  <Input name="title" required placeholder="Résistance des matériaux" />
                </Field>
                <Field label="Code" hint="facultatif">
                  <Input name="code" placeholder="RDM301" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Classe">
                  <Select name="classGroupId" required defaultValue="">
                    <option value="" disabled>
                      Choisir la classe
                    </option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                {user.role === "ADMIN" && (
                  <Field label="Enseignant">
                    <Select name="teacherId" defaultValue="">
                      <option value="">Moi (administration)</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
              <fieldset>
                <legend className="mb-1.5 text-sm font-bold text-ink">Couleur</legend>
                <div className="flex flex-wrap gap-2.5">
                  {COLORS.map((c, i) => (
                    <label key={c} className="cursor-pointer">
                      <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" aria-label={`Couleur ${i + 1}`} />
                      <span
                        className="block h-8 w-8 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                        style={{ background: c }}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Description" hint="facultatif">
                <Textarea name="description" className="min-h-16" placeholder="Ce que les étudiants vont apprendre" />
              </Field>
              <SubmitButton icon={<Plus />}>Créer le cours</SubmitButton>
            </ActionForm>
          )}
        </Disclosure>
      )}

      {courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const k = counts.get(c.id);
            const fresh = k?.lastActivity && k.lastActivity.getTime() > recentLimit;
            return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[0_6px_24px_-12px_rgb(18_51_43/0.25)]"
              >
                <div className="ruled relative flex h-24 items-start justify-between p-4" style={{ backgroundColor: c.color }}>
                  {c.code ? <span className="rounded-md bg-black/20 px-2 py-0.5 text-xs font-bold tracking-wide text-white">{c.code}</span> : <span />}
                  {fresh && <Badge tone="chalk">Nouveau</Badge>}
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <h2 className="line-clamp-2 text-[1.0625rem] font-bold leading-snug text-ink group-hover:text-accent">{c.title}</h2>
                  <p className="mt-1 truncate text-[13px] text-muted">
                    {user.role === "TEACHER" ? c.classGroup.name : `${c.teacher.name}, ${c.classGroup.name}`}
                  </p>
                  <div className="mt-auto flex gap-4 pt-4 text-[13px] text-faint">
                    <span className="flex items-center gap-1.5">
                      <MessagesSquare size={14} aria-hidden />
                      {plural(k?.items ?? 0, "publication")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} aria-hidden />
                      {plural(k?.docs ?? 0, "document")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty icon={BookOpen} title={canCreate ? "Aucun cours pour l'instant" : "Aucun cours pour ta classe"}>
          {canCreate
            ? "Crée un premier cours avec le formulaire ci-dessus."
            : isStudentLike(user) && !user.classGroupId
              ? "Ton compte n'est rattaché à aucune classe. Demande à l'administration de t'ajouter."
              : "Les cours apparaîtront ici dès que tes enseignants les auront créés."}
        </Empty>
      )}
    </>
  );
}
