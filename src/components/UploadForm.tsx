import { uploadDocument } from "@/app/actions/courses";
import { DOC_KIND_LABELS } from "@/lib/documents";
import { ActionForm, SubmitButton } from "./forms";
import { Field, Input, Select, Textarea } from "./ui";

export function UploadForm({
  courses,
  fixedCourseId,
  mode = "share",
  submitLabel = "Partager le document",
  defaultKind = "COURSE",
}: {
  courses?: { id: string; title: string }[];
  fixedCourseId?: string;
  mode?: "share" | "contribution";
  submitLabel?: string;
  defaultKind?: string;
}) {
  return (
    <ActionForm action={uploadDocument} className="space-y-3">
      <input type="hidden" name="mode" value={mode} />
      {fixedCourseId ? (
        <input type="hidden" name="courseId" value={fixedCourseId} />
      ) : (
        <Field label="Cours">
          <Select name="courseId" required defaultValue="">
            <option value="" disabled>
              Choisir...
            </option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Fichier" hint="(PDF, Word, PowerPoint, images...)">
        <Input name="file" type="file" required className="file:mr-3 file:rounded file:border-0 file:bg-stone-100 file:px-2 file:py-1 file:text-sm" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titre" hint="(facultatif)">
          <Input name="title" placeholder="Nom du fichier par défaut" />
        </Field>
        <Field label="Type">
          <Select name="kind" defaultValue={defaultKind}>
            {Object.entries(DOC_KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {mode === "contribution" && (
        <>
          <Field label="Année universitaire" hint="(facultatif)">
            <Input name="academicYear" placeholder="2025-2026" />
          </Field>
          <Field label="Description" hint="(facultatif)">
            <Textarea name="description" className="min-h-16" placeholder="Ex : sujet de l'examen de janvier, avec barème" />
          </Field>
        </>
      )}
      <SubmitButton pendingText="Envoi et indexation...">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
