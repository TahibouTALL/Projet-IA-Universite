import { requireUser, visibleCourses } from "@/lib/access";
import { generateCourseAction } from "@/app/actions/ai";
import { Choice } from "@/components/ui";
import { GeneratorPage, LEVEL_OPTIONS, LEVELS } from "../GeneratorPage";

// Génération IA : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;
export const metadata = { title: "Générer un cours" };

export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireUser();
  const courses = await visibleCourses(user);
  return (
    <GeneratorPage
      title="Cours rédigé"
      description="Un cours structuré avec objectifs, définitions, exemples résolus et l'essentiel à retenir."
      action={generateCourseAction}
      courses={courses}
      courseId={(await searchParams).course}
      topicLabel="Quelle notion ?"
      topicPlaceholder="Flexion simple des poutres"
      submit="Rédiger le cours"
    >
      <Choice name="level" label="Niveau" defaultValue={LEVELS[3]} options={LEVEL_OPTIONS} />
      <Choice
        name="depth"
        label="Longueur"
        defaultValue="standard"
        options={[
          { value: "court", label: "Fiche courte" },
          { value: "standard", label: "Standard" },
          { value: "approfondi", label: "Approfondi" },
        ]}
      />
    </GeneratorPage>
  );
}
