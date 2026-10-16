import { requireUser, visibleCourses } from "@/lib/access";
import { generateExercisesAction } from "@/app/actions/ai";
import { Field, Input, Select } from "@/components/ui";
import { GeneratorPage, LEVELS } from "../GeneratorPage";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

export const metadata = { title: "Exercices et corrections" };

export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  return (
    <GeneratorPage
      title="Exercices et corrections"
      subtitle="Les énoncés d'abord, la correction détaillée ensuite : essaie avant de regarder."
      action={generateExercisesAction}
      courses={courses}
      courseId={(await searchParams).course}
      topicPlaceholder="Méthode du simplexe"
      submit="Générer les exercices"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Niveau">
          <Select name="level" defaultValue={LEVELS[3]}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nombre">
          <Input name="count" type="number" min={1} max={10} defaultValue={4} />
        </Field>
        <Field label="Difficulté">
          <Select name="difficulty" defaultValue="progressif">
            <option value="progressif">Progressive</option>
            <option value="facile">Facile</option>
            <option value="moyen">Moyenne</option>
            <option value="difficile">Difficile (type examen)</option>
          </Select>
        </Field>
      </div>
    </GeneratorPage>
  );
}
