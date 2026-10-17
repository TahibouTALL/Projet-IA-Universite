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
    { href: "/dashboard", label: "Accueil", icon: "home" },
    { href: "/courses", label: user.role === "ADMIN" ? "Cours" : "Mes cours", short: "Cours", icon: "courses" },
    { href: "/documents", label: "Documents", icon: "documents" },
    { href: "/schedule", label: "Emploi du temps", icon: "schedule" },
    { href: "/announcements", label: "Annonces", icon: "announcements" },
    { href: "/ai", label: "Assistant IA", short: "IA", icon: "ai" },
  ];
  if (user.role === "AMBASSADOR") nav.push({ href: "/ambassador", label: "Espace ambassadeur", icon: "ambassador", group: "Contribuer" });
  if (user.role === "ADMIN" || user.role === "TEACHER") nav.push({ href: "/knowledge", label: "Base de l'IA", icon: "knowledge", group: "Gestion" });
  if (user.role === "ADMIN") nav.push({ href: "/admin", label: "Administration", icon: "admin", group: "Gestion" });

  return (
    <Shell appName={APP_NAME} nav={nav} user={{ name: user.name, roleLabel: ROLE_LABELS[user.role], classLabel: cls?.name }}>
      {children}
    </Shell>
  );
}
