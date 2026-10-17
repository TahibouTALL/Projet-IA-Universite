import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, ChevronLeft, Inbox, type LucideIcon } from "lucide-react";

export { DAYS, formatDate, formatSize } from "@/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- En-têtes ---------- */

export function PageHeader({
  title,
  description,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** ancien nom de `description` */
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  const desc = description ?? subtitle;
  return (
    <header className="mb-7 sm:mb-9">
      {back && (
        <Link href={back.href} className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-md px-1 text-sm font-semibold text-muted hover:text-ink">
          <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-[1.65rem] font-bold leading-[1.15] tracking-[-0.015em] text-ink sm:text-[2rem]">{title}</h1>
          {desc && <p className="mt-2 text-md text-muted">{desc}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  action,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** ancien nom de `action` */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mb-10", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.005em] text-ink">{title}</h2>
        {action ?? aside}
      </div>
      {description && <p className="-mt-1 mb-3 text-sm text-muted">{description}</p>}
      {children}
    </section>
  );
}

/* ---------- Conteneurs ---------- */

export function Panel({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-white", className)} {...p} />;
}
/** ancien nom de `Panel` */
export const Card = Panel;

export function Disclosure({
  summary,
  icon: Icon,
  hint,
  children,
  open,
  className,
}: {
  summary: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details className={cx("group rounded-2xl border border-line bg-white", className)} open={open}>
      <summary className="flex cursor-pointer select-none items-center gap-3 rounded-2xl px-4 py-3.5 hover:bg-paper/60 sm:px-5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon size={17} strokeWidth={2.25} aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">{summary}</span>
          {hint && <span className="block text-sm text-muted">{hint}</span>}
        </span>
        <ChevronDown size={18} className="shrink-0 text-faint transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line px-4 py-5 sm:px-5">{children}</div>
    </details>
  );
}

/* ---------- Boutons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "light" | "outlineLight";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line-strong bg-white text-ink hover:border-faint/60 hover:bg-paper",
  ghost: "text-muted hover:bg-ink/[0.05] hover:text-ink",
  danger: "border border-danger/25 bg-white text-danger hover:bg-danger-soft",
  light: "bg-white text-ink hover:bg-white/90",
  outlineLight: "border border-white/45 text-white hover:bg-white/10",
};
const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-md",
  sm: "h-8 px-3 text-sm",
};

export function button(variant: Variant = "primary", size: Size = "md") {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
    variants[variant],
    sizes[size],
  );
}

/** ancienne API : classes de bouton en taille normale */
export const btn = {
  primary: button("primary"),
  secondary: button("secondary"),
  ghost: button("ghost"),
  danger: button("danger"),
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon: Icon,
  className,
  children,
  ...p
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: LucideIcon }) {
  return (
    <Link className={cx(button(variant, size), className)} {...p}>
      {Icon && <Icon size={size === "sm" ? 15 : 17} strokeWidth={2.25} aria-hidden />}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  icon: Icon,
  className,
  ...p
}: ComponentProps<"button"> & { label: string; icon: LucideIcon }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx("inline-flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-ink/[0.05] hover:text-ink", className)}
      {...p}
    >
      <Icon size={16} strokeWidth={2} aria-hidden />
    </button>
  );
}

/* ---------- Formulaires ---------- */

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-sm font-bold text-ink">
      {children}
      {hint && <span className="ml-1.5 font-normal text-faint">{hint}</span>}
    </span>
  );
}

const field =
  "w-full rounded-[10px] border border-line-strong bg-white px-3 text-md text-ink outline-none transition placeholder:text-faint/75 focus:border-accent focus:ring-[3px] focus:ring-accent/15 disabled:bg-paper disabled:text-faint";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(field, "h-11 sm:h-10", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cx(field, "min-h-24 py-2.5 leading-relaxed", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(field, "select-chevron h-11 cursor-pointer sm:h-10", className)} {...p} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      {children}
    </label>
  );
}

/** Choix exclusif présenté en pastilles (boutons radio) */
export function Choice({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-bold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
            <span className="inline-flex h-9 items-center rounded-full border border-line-strong bg-white px-3.5 text-sm font-semibold text-muted transition-colors hover:border-faint/60 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent-strong peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent/25">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- Navigation par onglets (liens) ---------- */

export function Tabs({ items, active }: { items: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Sections" className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-5 sm:gap-6">
        {items.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={cx("relative flex items-center gap-2 whitespace-nowrap py-3 text-md font-bold transition-colors", on ? "text-ink" : "text-faint hover:text-ink")}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cx("rounded-full px-1.5 text-xs tabular", on ? "bg-accent-soft text-accent-strong" : "bg-ink/[0.06] text-muted")}>{t.count}</span>
              )}
              {on && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-accent" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- Petits éléments ---------- */

type Tone = "neutral" | "accent" | "warn" | "danger" | "chalk";
const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-muted",
  accent: "bg-accent-soft text-accent-strong",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  chalk: "bg-chalk text-ink",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

export function Empty({
  icon: Icon = Inbox,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center", className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={20} strokeWidth={2} aria-hidden />
      </span>
      {title && <p className="font-bold text-ink">{title}</p>}
      {children && <p className={cx("max-w-sm text-sm text-muted", title ? "mt-1" : "")}>{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const AVATAR_TONES = ["#1d6a55", "#8a5300", "#4338ca", "#a23a5a", "#0f6a8a", "#5b4fa8", "#6b6f2a", "#7a4b2a"];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: AVATAR_TONES[h % AVATAR_TONES.length] }}
    >
      {initials(name)}
    </span>
  );
}

/** Pastille colorée d'un cours */
export function CourseDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)} style={{ background: color }} />;
}
