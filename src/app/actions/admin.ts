"use server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireRole, teacherNames } from "@/lib/access";
import type { ActionResult } from "@/components/forms";

const ROLES = ["ADMIN", "TEACHER", "STUDENT", "AMBASSADOR"] as const;

// ---------- Classes ----------

export async function createClass(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");
  const name = String(data.get("name") || "").trim();
  const level = String(data.get("level") || "").trim();
  if (name.length < 2) return { error: "Donne un nom à la classe." };
  const exists = await db.query.classGroups.findFirst({ where: eq(schema.classGroups.name, name) });
  if (exists) return { error: "Cette classe existe déjà." };
  await db.insert(schema.classGroups).values({ name, level: level || null });
  revalidatePath("/admin");
  return { ok: `Classe « ${name} » créée.` };
}

export async function deleteClass(data: FormData) {
  await requireRole("ADMIN");
  await db.delete(schema.classGroups).where(eq(schema.classGroups.id, String(data.get("id"))));
  revalidatePath("/admin");
}

// ---------- Utilisateurs ----------

const UserSchema = z.object({
  name: z.string().trim().min(2, "Nom requis."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  password: z.string().min(8, "Mot de passe de 8 caractères minimum."),
  role: z.enum(ROLES),
  classGroupId: z.string().optional(),
});

export async function createUser(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = UserSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, v.email) });
  if (exists) return { error: "Un compte existe déjà avec cet email." };
  await db.insert(schema.users).values({
    name: v.name,
    email: v.email,
    passwordHash: await bcrypt.hash(v.password, 10),
    role: v.role,
    classGroupId: v.classGroupId || null,
  });
  revalidatePath("/admin");
  return { ok: `Compte créé pour ${v.name}.` };
}

export async function updateUser(data: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(data.get("id"));
  const role = String(data.get("role"));
  const classGroupId = String(data.get("classGroupId") || "") || null;
  if (!(ROLES as readonly string[]).includes(role)) throw new Error("Rôle invalide");
  if (id === admin.id && role !== "ADMIN") throw new Error("Tu ne peux pas retirer ton propre rôle d'administrateur.");
  await db
    .update(schema.users)
    .set({ role: role as (typeof ROLES)[number], classGroupId })
    .where(eq(schema.users.id, id));
  revalidatePath("/admin");
}

export async function resetPassword(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");
  const password = String(data.get("password") || "");
  if (password.length < 8) return { error: "8 caractères minimum." };
  await db
    .update(schema.users)
    .set({ passwordHash: await bcrypt.hash(password, 10) })
    .where(eq(schema.users.id, String(data.get("id"))));
  return { ok: "Mot de passe modifié." };
}

export async function deleteUser(data: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(data.get("id"));
  if (id === admin.id) throw new Error("Impossible de supprimer ton propre compte.");
  // Les cours dont il est responsable passent à un co-enseignant (sinon ils sont supprimés avec le compte)
  const owned = await db.query.courses.findMany({ where: eq(schema.courses.teacherId, id), with: { teachers: true } });
  for (const c of owned) {
    const next = c.teachers.find((t) => t.userId !== id);
    if (next) await db.update(schema.courses).set({ teacherId: next.userId }).where(eq(schema.courses.id, c.id));
  }
  await db.delete(schema.users).where(eq(schema.users.id, id));
  revalidatePath("/admin");
}

// ---------- Emploi du temps ----------

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EntrySchema = z.object({
  classGroupId: z.string().min(1),
  courseId: z.string().optional(),
  title: z.string().trim().optional(),
  dayOfWeek: z.coerce.number().int().min(1).max(6),
  startTime: z.string().regex(TIME, "Heure de début invalide (HH:MM)."),
  endTime: z.string().regex(TIME, "Heure de fin invalide (HH:MM)."),
  room: z.string().trim().optional(),
  teacherName: z.string().trim().optional(),
});

export async function addScheduleEntry(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");
  const parsed = EntrySchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.endTime <= v.startTime) return { error: "L'heure de fin doit suivre l'heure de début." };
  const course = v.courseId
    ? await db.query.courses.findFirst({ where: eq(schema.courses.id, v.courseId), with: { teacher: true, teachers: { with: { user: true } } } })
    : null;
  const title = v.title || course?.title;
  if (!title) return { error: "Choisis un cours ou donne un intitulé." };
  await db.insert(schema.scheduleEntries).values({
    classGroupId: v.classGroupId,
    courseId: course?.id ?? null,
    title,
    dayOfWeek: v.dayOfWeek,
    startTime: v.startTime,
    endTime: v.endTime,
    room: v.room || null,
    teacherName: v.teacherName || (course ? teacherNames(course) : null) || null,
  });
  revalidatePath("/schedule");
  return { ok: "Créneau ajouté." };
}

export async function deleteScheduleEntry(data: FormData) {
  await requireRole("ADMIN");
  await db.delete(schema.scheduleEntries).where(eq(schema.scheduleEntries.id, String(data.get("id"))));
  revalidatePath("/schedule");
}

const DAY_NAMES: Record<string, number> = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };

/**
 * Import CSV de l'emploi du temps d'une classe.
 * Colonnes : jour;début;fin;intitulé;salle;enseignant  (séparateur ; ou ,)
 * Exemple : Lundi;08:00;10:00;Résistance des matériaux;Amphi A;Awa Diop
 */
export async function importSchedule(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");
  const classGroupId = String(data.get("classGroupId") || "");
  const file = data.get("file") as File | null;
  if (!classGroupId) return { error: "Choisis la classe." };
  if (!file || file.size === 0) return { error: "Choisis un fichier CSV." };
  const replace = data.get("replace") === "on";

  const courses = await db.query.courses.findMany({ where: eq(schema.courses.classGroupId, classGroupId) });
  const text = (await file.text()).replace(/^﻿/, "");
  const rows: (typeof schema.scheduleEntries.$inferInsert)[] = [];
  const errors: string[] = [];

  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split(/[;,]/).map((c) => c.trim());
    const dayRaw = cols[0]?.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (i === 0 && dayRaw === "jour") return; // en-tête
    const day = DAY_NAMES[dayRaw] ?? Number(dayRaw);
    const [, start, end, title, room, teacher] = cols;
    const norm = (t?: string) => t?.replace("h", ":").padStart(5, "0");
    const s = norm(start);
    const e = norm(end);
    if (!(day >= 1 && day <= 6) || !s || !e || !TIME.test(s) || !TIME.test(e) || !title) {
      errors.push(`ligne ${i + 1}`);
      return;
    }
    const course = courses.find((c) => c.title.toLowerCase() === title.toLowerCase() || c.code?.toLowerCase() === title.toLowerCase());
    rows.push({
      classGroupId,
      courseId: course?.id ?? null,
      title: course?.title ?? title,
      dayOfWeek: day,
      startTime: s,
      endTime: e,
      room: room || null,
      teacherName: teacher || null,
    });
  });

  if (!rows.length) return { error: `Aucune ligne valide.${errors.length ? ` Erreurs : ${errors.join(", ")}` : ""}` };
  await db.transaction(async (tx) => {
    if (replace) await tx.delete(schema.scheduleEntries).where(eq(schema.scheduleEntries.classGroupId, classGroupId));
    await tx.insert(schema.scheduleEntries).values(rows);
  });
  revalidatePath("/schedule");
  return {
    ok: `${rows.length} créneau(x) importé(s).${errors.length ? ` Lignes ignorées : ${errors.join(", ")}.` : ""}`,
  };
}

// ---------- Annonces ----------

export async function createAnnouncement(_: ActionResult, data: FormData): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");
  const title = String(data.get("title") || "").trim();
  const body = String(data.get("body") || "").trim();
  if (!title || !body) return { error: "Titre et message requis." };
  await db.insert(schema.announcements).values({
    title,
    body,
    pinned: data.get("pinned") === "on",
    classGroupId: String(data.get("classGroupId") || "") || null,
    authorId: admin.id,
  });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { ok: "Annonce publiée." };
}

export async function deleteAnnouncement(data: FormData) {
  await requireRole("ADMIN");
  await db.delete(schema.announcements).where(eq(schema.announcements.id, String(data.get("id"))));
  revalidatePath("/announcements");
}

export async function togglePin(data: FormData) {
  await requireRole("ADMIN");
  const id = String(data.get("id"));
  const a = await db.query.announcements.findFirst({ where: and(eq(schema.announcements.id, id)) });
  if (!a) return;
  await db.update(schema.announcements).set({ pinned: !a.pinned }).where(eq(schema.announcements.id, id));
  revalidatePath("/announcements");
}
