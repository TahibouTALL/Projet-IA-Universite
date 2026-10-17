import { Download, Trash2 } from "lucide-react";
import { deleteDocument } from "@/app/actions/courses";
import { DOC_KIND_LABELS } from "@/lib/documents";
import { formatSize, relativeTime } from "@/lib/format";
import type { DocKind } from "@/db/schema";
import { ConfirmIcon } from "./ConfirmIcon";
import { FileTile } from "./FileTile";
import { Badge } from "./ui";

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
  extra?: string;
};

function byLine(d: DocRow) {
  const who = d.uploaderName ?? "";
  if (d.source === "STUDENT") return who ? `Partagé par ${who}` : "Partagé par un étudiant";
  if (d.source === "AMBASSADOR") return who ? `Déposé par ${who}` : "Déposé par un ambassadeur";
  return who;
}

export function DocList({ docs, showCourse = false }: { docs: DocRow[]; showCourse?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {docs.map((d) => {
        const meta = [showCourse ? d.courseTitle : null, byLine(d), relativeTime(d.createdAt), formatSize(d.size), d.extra].filter(Boolean);
        return (
          <li key={d.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
            <FileTile fileName={d.fileName} />
            <div className="min-w-0 flex-1">
              <a href={`/api/files/${d.id}`} target="_blank" className="block truncate font-bold text-ink hover:text-accent hover:underline">
                {d.title}
              </a>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                <Badge tone={d.kind === "CORRECTION" || d.kind === "EXAM" ? "accent" : "neutral"}>{DOC_KIND_LABELS[d.kind]}</Badge>
                {d.aiOnly && <Badge tone="chalk">Base de l'IA</Badge>}
                <span className="min-w-0">{meta.join(", ")}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <a
                href={`/api/files/${d.id}?download`}
                aria-label={`Télécharger ${d.title}`}
                title="Télécharger"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-ink/[0.05] hover:text-ink"
              >
                <Download size={17} aria-hidden />
              </a>
              {d.canDelete && (
                <form action={deleteDocument}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <DeleteDocButton title={d.title} />
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DeleteDocButton({ title }: { title: string }) {
  return (
    <ConfirmIcon message={`Supprimer « ${title} » ?`} label={`Supprimer ${title}`}>
      <Trash2 size={16} aria-hidden />
    </ConfirmIcon>
  );
}

