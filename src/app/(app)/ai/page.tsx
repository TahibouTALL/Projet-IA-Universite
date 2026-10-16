import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/access";
import { aiIsSimulated } from "@/lib/ai/provider";
import { Badge, Card, Empty, formatDate, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Assistant IA" };

const TYPE_LABEL = { COURSE: "Cours", EXERCISES: "Exercices", PRESENTATION: "Présentation" } as const;

export default async function AiHub() {
  const user = await requireUser();
  const staff = user.role === "TEACHER" || user.role === "ADMIN";
  const tools = [
    { href: "/ai/chat", title: "Tuteur IA", text: "Pose tes questions sur un cours. L'IA s'appuie sur les documents de l'établissement et cite ses sources." },
    { href: "/ai/course", title: "Générer un cours", text: staff ? "Rédige un cours structuré prêt à publier, à partir d'un sujet et d'un niveau." : "Obtiens un cours clair sur une notion, avec exemples et points à retenir." },
    { href: "/ai/exercises", title: staff ? "Générer une série d'exercices" : "Exercices et corrections", text: "Des exercices au niveau voulu, avec une correction détaillée affichée à part." },
    ...(staff ? [{ href: "/ai/presentation", title: "Générer une présentation", text: "Un diaporama pédagogique à télécharger en PowerPoint ou à publier dans un cours." }] : []),
  ];
  const [history, chats] = await Promise.all([
    db.query.generations.findMany({
      where: eq(schema.generations.userId, user.id),
      columns: { id: true, type: true, topic: true, createdAt: true },
      orderBy: (g, { desc }) => [desc(g.createdAt)],
      limit: 12,
    }),
    db.query.chatSessions.findMany({
      where: eq(schema.chatSessions.userId, user.id),
      orderBy: (c, { desc }) => [desc(c.updatedAt)],
      limit: 6,
    }),
  ]);

  return (
    <>
      <PageHeader title="Assistant IA" subtitle="Comprendre, réviser et préparer ses cours." />
      {aiIsSimulated && (
        <Card className="mb-8 border-amber-200 bg-amber-50 p-4 text-sm text-warn">
          Mode simulation : les réponses sont des exemples. L'administration doit configurer un fournisseur IA pour obtenir de vraies réponses.
        </Card>
      )}
      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="group">
            <Card className="h-full p-5 transition group-hover:border-accent">
              <div className="font-semibold group-hover:text-accent">{t.title}</div>
              <p className="mt-2 text-sm text-muted">{t.text}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Mes générations">
          {history.length ? (
            <Card className="divide-y divide-line">
              {history.map((g) => (
                <Link key={g.id} href={`/ai/g/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                  <Badge>{TYPE_LABEL[g.type]}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.topic}</span>
                  <span className="text-xs text-faint">{formatDate(g.createdAt)}</span>
                </Link>
              ))}
            </Card>
          ) : (
            <Empty>Rien de généré pour l'instant.</Empty>
          )}
        </Section>
        <Section title="Discussions récentes">
          {chats.length ? (
            <Card className="divide-y divide-line">
              {chats.map((c) => (
                <Link key={c.id} href={`/ai/chat?session=${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  <span className="text-xs text-faint">{formatDate(c.updatedAt)}</span>
                </Link>
              ))}
            </Card>
          ) : (
            <Empty>Aucune discussion.</Empty>
          )}
        </Section>
      </div>
    </>
  );
}
