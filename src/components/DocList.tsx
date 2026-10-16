import { deleteDocument } from "@/app/actions/courses";
import { ConfirmButton } from "./forms";
import { Badge, formatDate, formatSize } from "./ui";
import { DOC_KIND_LABELS } from "@/lib/documents";
import type { DocKind } from "@/db/schema";

export type DocRow = {
  id: string;
  title: string;
  fileName: string;
  size: number;
  kind: DocKind;
  source: string;
  status: string;
  aiOnly?: boolean;
  createdAt: Date;
  uploaderName?: string;
  courseTitle?: string;
  canDelete?: boolean;
};

const SOURCE_LABEL: Record<string, string> = {
  TEACHER: "Enseignant",
  ADMIN: "Administration",
  STUDENT: "Partagé par un étudiant",
  AMBASSADOR: "Ambassadeur",
};

export function DocList({ docs, showCourse = false }: { docs: DocRow[]; showCourse?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-semibold uppercase text-muted">
            {d.fileName.split(".").pop()?.slice(0, 4)}
          </div>
          <div className="min-w-0 flex-1">
            <a href={`/api/files/${d.id}`} target="_blank" className="block truncate font-medium hover:text-accent">
              {d.title}
            </a>
            <div className="truncate text-xs text-muted">
              {[showCourse && d.courseTitle, SOURCE_LABEL[d.source], d.uploaderName, formatDate(d.createdAt), formatSize(d.size)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <Badge tone={d.kind === "CORRECTION" || d.kind === "EXAM" ? "accent" : "neutral"}>{DOC_KIND_LABELS[d.kind]}</Badge>
          {d.aiOnly && <Badge tone="accent">Base IA</Badge>}
          <a href={`/api/files/${d.id}?download`} className="hidden text-xs text-muted hover:text-ink sm:inline">
            Télécharger
          </a>
          {d.canDelete && (
            <form action={deleteDocument}>
              <input type="hidden" name="documentId" value={d.id} />
              <ConfirmButton message="Supprimer ce document ?">Supprimer</ConfirmButton>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
