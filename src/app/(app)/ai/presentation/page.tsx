import { requireRole, visibleCourses } from "@/lib/access";
import { generatePresentationAction } from "@/app/actions/ai";
import { Choice, Field, Input } from "@/components/ui";
import { GeneratorPage } from "../GeneratorPage";

// Génération IA : laisser jusqu'à 60 s (hébergement serverless type Vercel)
export const maxDuration = 60;
export const metadata = { title: "Générer une présentation" };

export default async function Page({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await requireRole("TEACHER", "ADMIN");
  const courses = await visibleCourses(user);
  return (
    <GeneratorPage
      title="Présentation"
      description="Un diaporama d'une idée par diapositive, avec notes orales. Tu le relis ici, puis tu le télécharges en PowerPoint ou le publies dans un cours."
      action={generatePresentationAction}
      courses={courses}
      courseId={(await searchParams).course}
      topicLabel="Sujet de la séance"
      topicPlaceholder="Introduction à la maîtrise statistique des procédés"
      submit="Générer la présentation"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Public">
          <Input name="audience" defaultValue="Étudiants de DIC1" />
        </Field>
        <Choice
          name="slides"
          label="Nombre de diapositives"
          defaultValue="10"
          options={["6", "10", "15", "20"].map((n) => ({ value: n, label: n }))}
        />
      </div>
    </GeneratorPage>
  );
}
