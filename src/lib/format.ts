// Mise en forme des dates, heures et fichiers, en français et à l'heure de Dakar
const TZ = "Africa/Dakar";

export const DAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DAYS_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function formatDate(d: Date | string, withTime = false) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: TZ,
  }).format(new Date(d));
}

export function formatLongDate(d: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(d));
}

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(d));
}

/** Jour (1 = lundi ... 7 = dimanche) et heure "HH:MM" actuels à Dakar. */
export function nowInDakar(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { dow, hm: `${get("hour")}:${get("minute")}` };
}

/** Début de journée à Dakar (UTC+0 toute l'année). */
function dayStart(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** "à l'instant", "il y a 5 min", "hier", "le 12 oct." */
export function relativeTime(d: Date | string, now = new Date()) {
  const date = new Date(d);
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  const days = Math.round((dayStart(now) - dayStart(date)) / 86400000);
  if (days === 0) return `il y a ${Math.floor(diff / 3600)} h`;
  if (days === 1) return `hier à ${formatTime(date)}`;
  if (days < 7) return `il y a ${days} jours`;
  return `le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ }).format(date)}`;
}

/** Échéance d'un devoir : texte lisible et niveau d'urgence. */
export function dueLabel(d: Date | string, now = new Date()): { text: string; tone: "danger" | "warn" | "neutral" } {
  const date = new Date(d);
  const days = Math.round((dayStart(date) - dayStart(now)) / 86400000);
  const time = formatTime(date);
  if (date < now) {
    const late = Math.max(1, -days);
    return { text: days === 0 ? `en retard depuis ${time}` : `en retard de ${late} jour${late > 1 ? "s" : ""}`, tone: "danger" };
  }
  if (days === 0) return { text: `aujourd'hui à ${time}`, tone: "danger" };
  if (days === 1) return { text: `demain à ${time}`, tone: "warn" };
  if (days < 7) return { text: `dans ${days} jours`, tone: "warn" };
  return { text: `le ${formatDate(date)}`, tone: "neutral" };
}

/** Durée lisible entre deux heures "HH:MM" : "25 min", "2 h 40". */
export function untilLabel(fromHm: string, toHm: string) {
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const m = toMin(toHm) - toMin(fromHm);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

type Slot = { dayOfWeek: number; startTime: string; endTime: string };

/**
 * Séance en cours ou prochaine séance d'une liste de créneaux hebdomadaires.
 * `when` se lit après "Prochaine séance :" ("demain à 08:00", "lundi à 10:15").
 */
export function nextSlot<T extends Slot>(slots: T[], now: { dow: number; hm: string }) {
  const sorted = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  const live = sorted.find((s) => s.dayOfWeek === now.dow && s.startTime <= now.hm && now.hm < s.endTime);
  if (live) return { slot: live, live: true, when: `en cours jusqu'à ${live.endTime}` };
  for (let d = 0; d <= 7; d++) {
    const day = ((now.dow - 1 + d) % 7) + 1;
    const s = sorted.find((x) => x.dayOfWeek === day && (d === 0 ? x.startTime > now.hm : true));
    if (!s) continue;
    const name = d === 0 ? "aujourd'hui" : d === 1 ? "demain" : d === 7 ? `${DAYS[day].toLowerCase()} prochain` : DAYS[day].toLowerCase();
    return { slot: s, live: false, when: `${name} à ${s.startTime}` };
  }
  return null;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1048576).toFixed(1).replace(".", ",")} Mo`;
}

/** Raccourcit un texte sans couper de mot, avec "…" si besoin. */
export function shorten(text: string, max = 60) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return (at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:.!?'-]+$/, "") + "…";
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n > 1 ? many : one}`;
}
