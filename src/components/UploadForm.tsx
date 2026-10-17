import { Upload } from "lucide-react";
import { uploadDocument } from "@/app/actions/courses";
import { DOC_KIND_LABELS } from "@/lib/documents";
import { ActionForm, SubmitButton } from "./forms";
import { FileDrop } from "./FileDrop";
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
  mode?: "share" | "ai";
  submitLabel?: string;
  defaultKind?: string;
}) {
  return (
    <ActionForm action={uploadDocument} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <FileDrop name="file" />
      {fixedCourseId ? (
        <input type="hidden" name="courseId" value={fixedCourseId} />
      ) : (
        <Field label="Cours">
          <Select name="courseId" required defaultValue="">
            <option value="" disabled>
              Choisir le cours
            </option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type de document">
          <Select name="kind" defaultValue={defaultKind}>
            {Object.entries(DOC_KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Titre" hint="facultatif">
          <Input name="title" placeholder="Nom du fichier par défaut" />
        </Field>
      </div>
      {mode === "ai" && (
        <>
          <Field label="Année universitaire" hint="facultatif">
            <Input name="academicYear" placeholder="2025-2026" />
          </Field>
          <Field label="Ce que contient le document" hint="facultatif">
            <Textarea name="description" className="min-h-16" placeholder="Sujet de l'examen de janvier, avec barème" />
          </Field>
        </>
      )}
      <SubmitButton icon={<Upload />} pendingText="Envoi et lecture du fichier...">
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  );
}
