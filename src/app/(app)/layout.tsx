import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ROLE_LABELS, requireUser } from "@/lib/access";
import { APP_NAME } from "@/lib/appname";
import { Shell, type NavItem } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cls = user.classGroupId
    ? await db.query.classGroups.findFirst({ where: eq(schema.classGroups.id, user.classGroupId) })
    : null;

  let pending = 0;
  if (user.role === "ADMIN" || user.role === "TEACHER") {
    const courseFilter =
      user.role === "TEACHER"
        ? inArray(
            schema.documents.courseId,
            db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.teacherId, user.id)),
          )
        : undefined;
    const [row] = await db
      .select({ n: count() })
      .from(schema.documents)
      .where(and(eq(schema.documents.status, "PENDING"), courseFilter));
    pending = row?.n ?? 0;
  }

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Tableau de bord" },
    { href: "/courses", label: user.role === "ADMIN" ? "Cours" : "Mes cours" },
    { href: "/documents", label: "Documents" },
    { href: "/schedule", label: "Emploi du temps" },
    { href: "/announcements", label: "Annonces" },
    { href: "/ai", label: "Assistant IA" },
  ];
  if (user.role === "AMBASSADOR") nav.push({ href: "/ambassador", label: "Espace ambassadeur" });
  if (user.role === "ADMIN" || user.role === "TEACHER") nav.push({ href: "/moderation", label: "Contributions", badge: pending });
  if (user.role === "ADMIN") nav.push({ href: "/admin", label: "Administration" });

  return (
    <Shell appName={APP_NAME} nav={nav} user={{ name: user.name, roleLabel: ROLE_LABELS[user.role], classLabel: cls?.name }}>
      {children}
    </Shell>
  );
}
