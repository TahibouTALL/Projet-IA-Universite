"use server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ActionResult } from "@/components/forms";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Indique ton nom complet."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
  classGroupId: z.string().min(1, "Choisis ta classe."),
});

export async function register(_: ActionResult, data: FormData): Promise<ActionResult> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, classGroupId } = parsed.data;

  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
  if (domain && !email.endsWith(`@${domain}`)) {
    return { error: `Utilise ton adresse institutionnelle (@${domain}).` };
  }
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return { error: "Un compte existe déjà avec cet email." };
  const cls = await db.query.classGroups.findFirst({ where: eq(schema.classGroups.id, classGroupId) });
  if (!cls) return { error: "Classe introuvable." };

  // L'inscription publique crée toujours un compte étudiant ; l'administration attribue les autres rôles.
  await db.insert(schema.users).values({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "STUDENT",
    classGroupId,
  });
  redirect("/login?registered=1");
}
