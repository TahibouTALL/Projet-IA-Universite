import { cx } from "./ui";

// Tuile colorée selon le type de fichier : on reconnaît un PDF ou un PowerPoint d'un coup d'œil
const KINDS: { test: RegExp; label?: string; bg: string; fg: string }[] = [
  { test: /\.pdf$/i, bg: "#fde8e6", fg: "#a8231b" },
  { test: /\.(docx?|odt|rtf)$/i, bg: "#e6edfc", fg: "#2449a6" },
  { test: /\.(pptx?|odp|key)$/i, bg: "#fdeee2", fg: "#a3440d" },
  { test: /\.(xlsx?|ods|csv)$/i, bg: "#e3f3ea", fg: "#16653f" },
  { test: /\.(png|jpe?g|gif|webp|svg)$/i, label: "IMG", bg: "#efe9fb", fg: "#5b3aa8" },
  { test: /\.(zip|rar|7z)$/i, label: "ZIP", bg: "#eceeed", fg: "#4f5c57" },
  { test: /\.(py|m|c|cpp|java|js|ts|ipynb|tex|md)$/i, bg: "#e5f1f4", fg: "#0f5f72" },
];

export function FileTile({ fileName, size = "md" }: { fileName: string; size?: "sm" | "md" }) {
  const k = KINDS.find((x) => x.test.test(fileName));
  const ext = (k?.label ?? fileName.split(".").pop() ?? "").slice(0, 4).toUpperCase() || "FICH";
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold tracking-tight",
        size === "md" ? "h-10 w-10 text-[10px]" : "h-7 w-7 text-[8.5px]",
      )}
      style={{ background: k?.bg ?? "#eceeed", color: k?.fg ?? "#4f5c57" }}
    >
      {ext}
    </span>
  );
}
