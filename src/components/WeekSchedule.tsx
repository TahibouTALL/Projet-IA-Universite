"use client";
import { useState } from "react";
import { MapPin, Trash2, UserRound } from "lucide-react";
import { deleteScheduleEntry } from "@/app/actions/admin";
import { ConfirmIcon } from "./ConfirmIcon";
import { cx } from "./ui";

export type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  room: string | null;
  teacherName: string | null;
  color: string;
};

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function SlotCard({ s, live, canEdit }: { s: Slot; live: boolean; canEdit: boolean }) {
  return (
    <div className={cx("relative rounded-xl border bg-white py-3 pl-4 pr-3", live ? "border-chalk shadow-[0_0_0_2px_var(--color-chalk)]" : "border-line")}>
      <span aria-hidden className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full" style={{ background: s.color }} />
      <div className="flex items-start justify-between gap-2">
        <p className="tabular text-sm font-bold text-muted">
          {s.startTime} – {s.endTime}
        </p>
        {live && <span className="rounded-md bg-chalk px-1.5 py-0.5 text-[11px] font-bold text-ink">En cours</span>}
        {canEdit && !live && (
          <form action={deleteScheduleEntry} className="-mr-1.5 -mt-1.5">
            <input type="hidden" name="id" value={s.id} />
            <ConfirmIcon message={`Retirer ${s.title} (${s.startTime}) de l'emploi du temps ?`} label={`Retirer ${s.title}`}>
              <Trash2 size={15} aria-hidden />
            </ConfirmIcon>
          </form>
        )}
      </div>
      <p className="mt-1 font-bold leading-snug text-ink">{s.title}</p>
      {(s.room || s.teacherName) && (
        <div className="mt-1.5 space-y-0.5 text-[13px] text-muted">
          {s.room && (
            <p className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0 text-faint" aria-hidden />
              {s.room}
            </p>
          )}
          {s.teacherName && (
            <p className="flex items-center gap-1.5">
              <UserRound size={13} className="shrink-0 text-faint" aria-hidden />
              <span className="truncate">{s.teacherName}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Semaine en colonnes sur ordinateur ; sur téléphone, un jour à la fois avec un sélecteur de jour. */
export function WeekSchedule({
  slots,
  today,
  nowHm,
  dates,
  canEdit,
}: {
  slots: Slot[];
  today: number;
  nowHm: string;
  dates: string[];
  canEdit: boolean;
}) {
  const [day, setDay] = useState(today >= 1 && today <= 6 ? today : 1);
  const byDay = (d: number) => slots.filter((s) => s.dayOfWeek === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const isLive = (s: Slot) => s.dayOfWeek === today && s.startTime <= nowHm && nowHm < s.endTime;

  return (
    <>
      {/* Téléphone et tablette */}
      <div className="lg:hidden">
        <div role="tablist" aria-label="Jour" className="mb-5 grid grid-cols-6 gap-1.5">
          {SHORT.map((label, i) => {
            const d = i + 1;
            const on = d === day;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={on}
                onClick={() => setDay(d)}
                className={cx(
                  "relative flex flex-col items-center rounded-xl py-2 transition-colors",
                  on ? "bg-board text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink",
                )}
              >
                <span className="text-xs font-semibold">{label}</span>
                <span className={cx("tabular text-lg font-bold leading-tight", on ? "text-chalk" : "text-ink")}>{dates[i].split(" ")[0]}</span>
                {d === today && <span aria-label="Aujourd'hui" className={cx("absolute bottom-1 h-1 w-1 rounded-full", on ? "bg-chalk" : "bg-accent")} />}
              </button>
            );
          })}
        </div>
        <p className="mb-3 font-bold text-ink">
          {DAYS[day - 1]} {dates[day - 1]}
          {day === today && <span className="ml-2 text-sm font-semibold text-accent">Aujourd'hui</span>}
        </p>
        <div className="space-y-2.5">
          {byDay(day).length ? (
            byDay(day).map((s) => <SlotCard key={s.id} s={s} live={isLive(s)} canEdit={canEdit} />)
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">Pas de cours ce jour-là.</p>
          )}
        </div>
      </div>

      {/* Ordinateur : la semaine entière */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-6">
        {DAYS.map((label, i) => {
          const d = i + 1;
          const list = byDay(d);
          const isToday = d === today;
          return (
            <div key={d} className={cx("rounded-2xl p-2", isToday ? "bg-accent-soft/70" : "")}>
              <div className="mb-2 flex items-baseline justify-between px-1.5 pt-1">
                <p className={cx("font-bold", isToday ? "text-accent-strong" : "text-ink")}>{label}</p>
                <p className={cx("text-xs", isToday ? "font-bold text-accent-strong" : "text-faint")}>{isToday ? "Aujourd'hui" : dates[i]}</p>
              </div>
              <div className="space-y-2">
                {list.length ? (
                  list.map((s) => <SlotCard key={s.id} s={s} live={isLive(s)} canEdit={canEdit} />)
                ) : (
                  <p className="rounded-xl border border-dashed border-line-strong px-2 py-4 text-center text-xs text-faint">Libre</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
