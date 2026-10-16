// Données de démonstration (fictives) pour tester la plateforme.
// Usage : npm run db:seed   (ne fait rien si un administrateur existe déjà, sauf avec --force)
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existing = await db.query.users.findFirst({ where: eq(schema.users.role, "ADMIN") });
  if (existing && !process.argv.includes("--force")) {
    console.log("Un administrateur existe déjà, seed ignoré (ajoute --force pour forcer).");
    await pool.end();
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@campus.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin1234";
  const demo = !process.argv.includes("--admin-only");
  const hash = (p: string) => bcrypt.hash(p, 10);

  const [admin] = await db
    .insert(schema.users)
    .values({ name: "Administration", email: adminEmail, passwordHash: await hash(adminPassword), role: "ADMIN" })
    .onConflictDoNothing()
    .returning();
  console.log(`Admin : ${adminEmail} / ${adminPassword}`);

  if (!demo) {
    await pool.end();
    return;
  }

  const [dic1, dic2] = await db
    .insert(schema.classGroups)
    .values([
      { name: "DIC1 Génie industriel", level: "Bac+3" },
      { name: "DIC2 Génie industriel", level: "Bac+4" },
    ])
    .returning();

  const pwd = await hash("demo1234");
  const [teacher, teacher2, student, ambassador] = await db
    .insert(schema.users)
    .values([
      { name: "Awa Diop", email: "prof.diop@campus.test", passwordHash: pwd, role: "TEACHER" },
      { name: "Ousmane Sarr", email: "prof.sarr@campus.test", passwordHash: pwd, role: "TEACHER" },
      { name: "Moussa Ndiaye", email: "etudiant@campus.test", passwordHash: pwd, role: "STUDENT", classGroupId: dic1.id },
      { name: "Fatou Fall", email: "ambassadeur@campus.test", passwordHash: pwd, role: "AMBASSADOR", classGroupId: dic1.id },
    ])
    .returning();

  const [rdm, rop, qual] = await db
    .insert(schema.courses)
    .values([
      { title: "Résistance des matériaux", code: "RDM301", classGroupId: dic1.id, teacherId: teacher.id, color: "#0f766e", description: "Contraintes, déformations, flexion et torsion des poutres." },
      { title: "Recherche opérationnelle", code: "RO302", classGroupId: dic1.id, teacherId: teacher2.id, color: "#b45309", description: "Programmation linéaire, simplexe, dualité, graphes." },
      { title: "Gestion de la qualité", code: "GQ401", classGroupId: dic2.id, teacherId: teacher.id, color: "#4338ca", description: "Outils de la qualité, normes ISO 9001, maîtrise statistique des procédés." },
    ])
    .returning();

  await db.insert(schema.courseItems).values([
    {
      courseId: rdm.id,
      authorId: teacher.id,
      type: "LESSON",
      title: "Chapitre 1 : Contraintes et déformations",
      content: "## Notions\nLa contrainte normale vaut $\\sigma = \\dfrac{N}{S}$.\n\nLisez le polycopié avant la séance de lundi.",
    },
    {
      courseId: rdm.id,
      authorId: teacher.id,
      type: "ASSIGNMENT",
      title: "Devoir 1 : Traction simple",
      content: "Résoudre les exercices 1 à 4 de la fiche de TD.",
      dueDate: new Date(Date.now() + 7 * 86400000),
    },
    {
      courseId: rop.id,
      authorId: teacher2.id,
      type: "LESSON",
      title: "Introduction à la programmation linéaire",
      content: "Formulation d'un problème, forme standard, résolution graphique.",
    },
  ]);

  const week = [
    [1, "08:00", "10:00", rdm, "Amphi A"],
    [1, "10:15", "12:15", rop, "Salle 12"],
    [2, "08:00", "10:00", rop, "Salle 12"],
    [3, "14:00", "16:00", rdm, "Labo méca"],
    [4, "08:00", "12:00", rdm, "Amphi A"],
    [5, "10:15", "12:15", rop, "Salle 4"],
  ] as const;
  await db.insert(schema.scheduleEntries).values([
    ...week.map(([day, s, e, c, room]) => ({
      classGroupId: dic1.id,
      courseId: c.id,
      title: c.title,
      dayOfWeek: day,
      startTime: s,
      endTime: e,
      room,
      teacherName: c.teacherId === teacher.id ? teacher.name : teacher2.name,
    })),
    { classGroupId: dic2.id, courseId: qual.id, title: qual.title, dayOfWeek: 2, startTime: "14:00", endTime: "17:00", room: "Salle 7", teacherName: teacher.name },
  ]);

  await db.insert(schema.announcements).values([
    { title: "Bienvenue sur la plateforme", body: "Retrouvez ici vos cours, l'emploi du temps et l'assistant IA.", pinned: true, authorId: admin?.id ?? teacher.id },
    { title: "Examens de mi-semestre", body: "Les examens de DIC1 auront lieu la semaine du 9 novembre.", classGroupId: dic1.id, authorId: admin?.id ?? teacher.id },
  ]);

  console.log("Comptes de démo (mot de passe demo1234) :");
  for (const u of [teacher, teacher2, student, ambassador]) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
