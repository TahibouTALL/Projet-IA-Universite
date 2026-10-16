import type { ReactNode } from "react";
import { ActionForm, SubmitButton, type FormAction } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

export function GeneratorPage({
  title,
  subtitle,
  action,
  courses,
  courseId,
  topicPlaceholder,
  children,
  submit,
}: {
  title: string;
  subtitle: string;
  action: FormAction;
  courses: { id: string; title: string }[];
  courseId?: string;
  topicPlaceholder: string;
  children?: ReactNode;
  submit: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="max-w-2xl p-6">
        <ActionForm action={action} className="space-y-4" reset={false}>
          <Field label="Sujet">
            <Input name="topic" required placeholder={topicPlaceholder} />
          </Field>
          <Field label="Cours de référence" hint="(l'IA s'appuie sur ses documents)">
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
          <Field label="Consignes particulières" hint="(facultatif)">
            <Textarea name="extra" className="min-h-20" placeholder="Ex : insister sur les applications industrielles, inclure un exemple numérique..." />
          </Field>
          <SubmitButton pendingText="Génération en cours, cela peut prendre une minute...">{submit}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}

export const LEVELS = ["Lycée (Terminale)", "Classes préparatoires", "Licence 1-2", "Licence 3 / DIC1", "Master / DIC2-DIC3", "Formation professionnelle"];
