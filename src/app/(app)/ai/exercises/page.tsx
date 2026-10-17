import { requireUser, visibleCourses } from "@/lib/access";
import { generateExercisesAction } from "@/app/actions/ai";
import { Choice } from "@/components/ui";
import { GeneratorPage, LEVEL_OPTIONS, LEVELS } from "../GeneratorPage";

// Génération IA : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;
export const metadata = { title: "Exercices et corrections" };

export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  return (
    <GeneratorPage
      title="Exercices et corrections"
      description="Les énoncés d'abord. La correction détaillée reste cachée : essaie avant de regarder."
      action={generateExercisesAction}
      courses={courses}
      courseId={(await searchParams).course}
      topicLabel="Sur quel sujet ?"
      topicPlaceholder="Méthode du simplexe"
      submit="Générer les exercices"
    >
      <Choice name="level" label="Niveau" defaultValue={LEVELS[3]} options={LEVEL_OPTIONS} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Choice
          name="count"
          label="Nombre d'exercices"
          defaultValue="4"
          options={["2", "4", "6", "8"].map((n) => ({ value: n, label: n }))}
        />
        <Choice
          name="difficulty"
          label="Difficulté"
          defaultValue="progressif"
          options={[
            { value: "progressif", label: "Progressive" },
            { value: "facile", label: "Facile" },
            { value: "moyen", label: "Moyenne" },
            { value: "difficile", label: "Type examen" },
          ]}
        />
      </div>
    </GeneratorPage>
  );
}
