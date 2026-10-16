import { requireUser, visibleCourses } from "@/lib/access";
import { generateCourseAction } from "@/app/actions/ai";
import { Field, Select } from "@/components/ui";
import { GeneratorPage, LEVELS } from "../GeneratorPage";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

export const metadata = { title: "Générer un cours" };

export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  return (
    <GeneratorPage
      title="Générer un cours"
      subtitle="Un cours structuré avec objectifs, définitions, exemples résolus et points à retenir."
      action={generateCourseAction}
      courses={courses}
      courseId={(await searchParams).course}
      topicPlaceholder="Flexion simple des poutres"
      submit="Générer le cours"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Niveau">
          <Select name="level" defaultValue={LEVELS[3]}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Longueur">
          <Select name="depth" defaultValue="standard">
            <option value="court">Court (fiche)</option>
            <option value="standard">Standard</option>
            <option value="approfondi">Approfondi</option>
          </Select>
        </Field>
      </div>
    </GeneratorPage>
  );
}
