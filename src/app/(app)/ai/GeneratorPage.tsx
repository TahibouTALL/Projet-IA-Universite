import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { ActionForm, SubmitButton, type FormAction } from "@/components/forms";
import { Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

export function GeneratorPage({
  title,
  description,
  action,
  courses,
  courseId,
  topicLabel = "Sujet",
  topicPlaceholder,
  children,
  submit,
}: {
  title: string;
  description: string;
  action: FormAction;
  courses: { id: string; title: string }[];
  courseId?: string;
  topicLabel?: string;
  topicPlaceholder: string;
  children?: ReactNode;
  submit: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} back={{ href: "/ai", label: "Assistant IA" }} />
      <div className="max-w-2xl rounded-3xl border border-line bg-white p-5 sm:p-7">
        <ActionForm action={action} className="space-y-6" reset={false}>
          <Field label={topicLabel}>
            <Input name="topic" required placeholder={topicPlaceholder} className="h-12 text-[1.0625rem] sm:h-12" autoFocus />
          </Field>
          <Field label="Cours de référence" hint="l'IA lit ses documents">
            <Select name="courseId" defaultValue={courseId ?? ""}>
              <option value="">Tous mes cours</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
          {children}
          <Field label="Consignes particulières" hint="facultatif">
            <Textarea name="extra" className="min-h-20" placeholder="Insister sur les applications industrielles, inclure un exemple numérique..." />
          </Field>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <SubmitButton icon={<Sparkles />} pendingText="Génération en cours...">
              {submit}
            </SubmitButton>
            <p className="text-sm text-faint">Compte environ 30 secondes.</p>
          </div>
        </ActionForm>
      </div>
    </>
  );
}

export const LEVELS = ["Terminale", "Classes prépa", "Licence 1-2", "Licence 3 / DIC1", "Master / DIC2-3", "Formation pro"];
export const LEVEL_OPTIONS = LEVELS.map((l) => ({ value: l, label: l }));
