import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { DAYS, untilLabel } from "@/lib/format";
import { cx } from "./ui";

export type BoardEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  room: string | null;
  teacherName: string | null;
};

function where(e: BoardEntry, teacherView: boolean) {
  const parts = [e.room, !teacherView && e.teacherName ? `avec ${e.teacherName}` : null].filter(Boolean);
  return parts.join(", ");
}

/**
 * Le bloc signature de l'accueil : la journée écrite au tableau.
 * Il répond d'abord à "qu'est-ce que j'ai maintenant ?", puis montre le reste de la journée.
 */
export function TodayBoard({ week, now, teacherView = false }: { week: BoardEntry[]; now: { dow: number; hm: string }; teacherView?: boolean }) {
  const today = week.filter((e) => e.dayOfWeek === now.dow).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const current = today.find((e) => e.startTime <= now.hm && now.hm < e.endTime);
  const next = today.find((e) => e.startTime > now.hm);

  // Prochain jour de cours si la journée est finie ou vide
  let later: { label: string; entries: BoardEntry[] } | null = null;
  if (!current && !next) {
    for (let d = 1; d <= 7; d++) {
      const day = ((now.dow - 1 + d) % 7) + 1;
      const list = week.filter((e) => e.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (list.length) {
        later = { label: d === 1 ? "Demain" : DAYS[day], entries: list };
        break;
      }
    }
  }

  const focus = current ?? next ?? later?.entries[0] ?? null;
  // Sous le cours mis en avant : le reste de la journée, ou le programme du prochain jour de cours
  const showToday = !!(current || next);
  const strip = showToday ? today : later?.entries ?? [];
  const stripLabel = showToday ? "Aujourd'hui" : later?.label ?? "";
  let kicker: string;
  let detail: string | null = null;
  if (current) {
    kicker = "En ce moment";
    detail = `jusqu'à ${current.endTime}`;
  } else if (next) {
    kicker = "Prochain cours";
    detail = `dans ${untilLabel(now.hm, next.startTime)}`;
  } else if (later) {
    kicker = today.length ? "Fini pour aujourd'hui" : "Pas de cours aujourd'hui";
    detail = `${later.label} à ${later.entries[0].startTime}`;
  } else {
    kicker = "Emploi du temps";
  }

  return (
    <section aria-label="Ta journée" className="board relative overflow-hidden rounded-3xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm font-bold text-chalk">{kicker}</p>
        {detail && <p className="text-sm text-white/70">{detail}</p>}
      </div>

      {focus ? (
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-7">
          <p className="font-serif text-[3.4rem] font-semibold leading-none tracking-[-0.02em] text-chalk [font-variant-numeric:lining-nums_tabular-nums] sm:text-[4.4rem]">{focus.startTime}</p>
          <div className="min-w-0 pb-1">
            <p className="text-[1.375rem] font-bold leading-tight sm:text-[1.6rem]">{focus.title}</p>
            {where(focus, teacherView) && (
              <p className="mt-1 flex items-center gap-1.5 text-md text-white/75">
                <MapPin size={15} aria-hidden className="shrink-0" />
                {where(focus, teacherView)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 max-w-md">
          <p className="text-[1.375rem] font-bold leading-tight">Rien n'est encore écrit au tableau.</p>
          <p className="mt-1 text-md text-white/75">
            {teacherView
              ? "Aucun créneau n'est encore associé à tes cours dans l'emploi du temps."
              : "L'emploi du temps de ta classe n'est pas encore en ligne. L'administration l'ajoutera ici."}
          </p>
        </div>
      )}

      {strip.length > 0 && (
        <div className="mt-6 border-t border-white/15 pt-4">
          <p className="mb-2.5 text-xs font-bold text-white/60">{stripLabel}</p>
          <ol className="flex flex-wrap gap-2">
            {strip.map((e) => {
              const past = showToday && e.endTime <= now.hm;
              const on = e === focus;
              return (
                <li
                  key={e.id}
                  className={cx(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                    on ? "bg-chalk font-bold text-ink" : past ? "bg-white/[0.06] text-white/45 line-through decoration-white/30" : "bg-white/10 text-white",
                  )}
                >
                  <span className="tabular font-bold">{e.startTime}</span>
                  <span className="max-w-[14rem] truncate">{e.title}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <Link
        href="/schedule"
        className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-white underline decoration-white/35 underline-offset-4 hover:decoration-white"
      >
        <CalendarDays size={16} aria-hidden />
        Voir toute la semaine
      </Link>
    </section>
  );
}
