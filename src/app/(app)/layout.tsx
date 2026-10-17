import { eq } from "drizzle-orm";
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

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Tableau de bord", short: "Accueil" },
    { href: "/courses", label: user.role === "ADMIN" ? "Cours" : "Mes cours", short: "Cours" },
    { href: "/documents", label: "Documents" },
    { href: "/schedule", label: "Emploi du temps", short: "Horaires" },
    { href: "/announcements", label: "Annonces" },
    { href: "/ai", label: "Assistant IA", short: "IA" },
  ];
  if (user.role === "AMBASSADOR") nav.push({ href: "/ambassador", label: "Espace ambassadeur" });
  if (user.role === "ADMIN" || user.role === "TEACHER") nav.push({ href: "/knowledge", label: "Base de l'IA" });
  if (user.role === "ADMIN") nav.push({ href: "/admin", label: "Administration" });

  return (
    <Shell appName={APP_NAME} nav={nav} user={{ name: user.name, roleLabel: ROLE_LABELS[user.role], classLabel: cls?.name }}>
      {children}
    </Shell>
  );
}
