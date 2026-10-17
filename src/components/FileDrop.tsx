"use client";
import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { FileTile } from "./FileTile";
import { cx } from "./ui";
import { formatSize } from "@/lib/format";

/** Zone de dépôt : on touche pour choisir un fichier, ou on le glisse dessus sur ordinateur. */
export function FileDrop({ name, multiple = false, hint }: { name: string; multiple?: boolean; hint?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const clear = () => setFiles([]);
    form.addEventListener("reset", clear);
    form.addEventListener("reset-files", clear);
    return () => {
      form.removeEventListener("reset", clear);
      form.removeEventListener("reset-files", clear);
    };
  }, []);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (ref.current && e.dataTransfer.files.length) {
          ref.current.files = e.dataTransfer.files;
          setFiles(Array.from(e.dataTransfer.files));
        }
      }}
      className={cx(
        "flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed px-4 py-4 transition-colors focus-within:border-accent",
        over ? "border-accent bg-accent-soft" : "border-line-strong bg-paper/60 hover:border-accent/50",
      )}
    >
      <input
        ref={ref}
        type="file"
        name={name}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      {files.length ? (
        <>
          {files.map((f) => (
            <span key={f.name + f.size} className="flex min-w-0 items-center gap-3">
              <FileTile fileName={f.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{f.name}</span>
              <span className="shrink-0 text-xs text-faint">{formatSize(f.size)}</span>
            </span>
          ))}
          <span className="text-xs font-semibold text-accent">Changer de fichier</span>
        </>
      ) : (
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-accent shadow-[0_0_0_1px_var(--color-line)]">
            <Upload size={18} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">{multiple ? "Choisir des fichiers" : "Choisir un fichier"}</span>
            <span className="block text-xs text-muted">{hint ?? "PDF, Word, PowerPoint, images... ou glisse-le ici"}</span>
          </span>
        </span>
      )}
    </label>
  );
}
