"use server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/access";
import type { ActionResult } from "@/components/forms";

export async function changePassword(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const current = String(data.get("current") || "");
  const next = String(data.get("next") || "");
  const confirm = String(data.get("confirm") || "");
  if (next.length < 8) return { error: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  if (next !== confirm) return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) return { error: "Mot de passe actuel incorrect." };
  await db.update(schema.users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(schema.users.id, user.id));
  return { ok: "Mot de passe modifié." };
}

export async function updateName(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(data.get("name") || "").trim();
  if (name.length < 2) return { error: "Indique ton nom complet." };
  await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
  return { ok: "Nom mis à jour." };
}
