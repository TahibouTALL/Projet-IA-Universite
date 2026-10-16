import { requireRole, visibleCourses } from "@/lib/access";
import { generatePresentationAction } from "@/app/actions/ai";
import { Field, Input } from "@/components/ui";
import { GeneratorPage } from "../GeneratorPage";

// Génération IA et indexation des documents : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;

export const metadata = { title: "Générer une présentation" };

export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireRole("TEACHER", "ADMIN");
  const courses = await visibleCourses(user);
  return (
    <GeneratorPage
      title="Générer une présentation"
      subtitle="Un diaporama pédagogique, une idée par diapositive, avec notes orales. Téléchargeable en PowerPoint."
      action={generatePresentationAction}
      courses={courses}
      courseId={(await searchParams).course}
      topicPlaceholder="Introduction à la maîtrise statistique des procédés"
      submit="Générer la présentation"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Public">
          <Input name="audience" defaultValue="Étudiants de DIC1" />
        </Field>
        <Field label="Nombre de diapositives">
          <Input name="slides" type="number" min={3} max={25} defaultValue={10} />
        </Field>
      </div>
    </GeneratorPage>
  );
}
