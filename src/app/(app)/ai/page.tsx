import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowUp, BookOpenText, ChevronRight, ListChecks, MessageCircle, Presentation, Sparkles, type LucideIcon } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/access";
import { aiIsSimulated } from "@/lib/ai/provider";
import { relativeTime } from "@/lib/format";
import { Empty, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Assistant IA" };

const KIND: Record<string, { label: string; icon: LucideIcon }> = {
  CHAT: { label: "Discussion", icon: MessageCircle },
  COURSE: { label: "Cours", icon: BookOpenText },
  EXERCISES: { label: "Exercices", icon: ListChecks },
  PRESENTATION: { label: "Présentation", icon: Presentation },
};

const SUGGESTIONS = [
  "Explique-moi la notion de moment quadratique",
  "Résume le dernier chapitre",
  "Donne-moi 3 exercices corrigés",
];

export default async function AiHub() {
  const user = await requireUser();
  const staff = user.role === "TEACHER" || user.role === "ADMIN";
  const tools = [
    {
      href: "/ai/exercises",
      icon: ListChecks,
      title: staff ? "Série d'exercices" : "Exercices et corrections",
      text: "Des énoncés au bon niveau, et une correction détaillée qui reste cachée tant que tu ne l'ouvres pas.",
    },
    {
      href: "/ai/course",
      icon: BookOpenText,
      title: "Cours rédigé",
      text: staff ? "Un cours structuré prêt à relire et à publier, à partir d'un sujet et d'un niveau." : "Une notion expliquée pas à pas, avec des exemples et l'essentiel à retenir.",
    },
    ...(staff
      ? [{ href: "/ai/presentation", icon: Presentation, title: "Présentation", text: "Un diaporama d'une idée par diapositive, avec notes orales, à télécharger en PowerPoint." }]
      : []),
  ];

  const [gens, chats] = await Promise.all([
    db.query.generations.findMany({
      where: eq(schema.generations.userId, user.id),
      columns: { id: true, type: true, topic: true, createdAt: true },
      orderBy: (g, { desc }) => [desc(g.createdAt)],
      limit: 10,
    }),
    db.query.chatSessions.findMany({
      where: eq(schema.chatSessions.userId, user.id),
      orderBy: (c, { desc }) => [desc(c.updatedAt)],
      limit: 10,
    }),
  ]);
  const history = [
    ...gens.map((g) => ({ id: g.id, kind: g.type as string, title: g.topic, at: g.createdAt, href: `/ai/g/${g.id}` })),
    ...chats.map((c) => ({ id: c.id, kind: "CHAT", title: c.title, at: c.updatedAt, href: `/ai/chat?session=${c.id}` })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return (
    <>
      <PageHeader title="Assistant IA" description="Comprendre un cours, s'entraîner, préparer ses supports. L'assistant s'appuie sur les documents de tes cours." />

      {aiIsSimulated && (
        <p className="mb-6 rounded-2xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          Mode démonstration : les réponses sont des exemples tant qu'aucun service d'IA n'est branché.
        </p>
      )}

      {/* Le tuteur d'abord : c'est l'usage le plus fréquent */}
      <section className="mb-10 rounded-3xl border border-line bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="board flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-chalk">IA</span>
          <div>
            <h2 className="font-bold text-ink">Tuteur</h2>
            <p className="text-sm text-muted">Pose ta question comme à un enseignant. Il cite les documents qu'il utilise.</p>
          </div>
        </div>
        <Link
          href="/ai/chat"
          className="group flex items-center gap-3 rounded-2xl border border-line-strong bg-paper/50 py-2 pl-4 pr-2 transition-colors hover:border-accent hover:bg-white"
        >
          <Sparkles size={18} className="shrink-0 text-accent" aria-hidden />
          <span className="flex-1 truncate text-md text-faint">Pose une question sur un cours...</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white group-hover:bg-accent-strong">
            <ArrowUp size={18} strokeWidth={2.25} aria-hidden />
          </span>
        </Link>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              href={`/ai/chat?q=${encodeURIComponent(s)}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent-strong"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Générer">
          <ul className="space-y-3">
            {tools.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-line-strong sm:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <t.icon size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink group-hover:text-accent">{t.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{t.text}</span>
                  </span>
                  <ChevronRight size={18} className="mt-2.5 shrink-0 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Reprendre">
          {history.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {history.map((h) => {
                const K = KIND[h.kind] ?? KIND.CHAT;
                return (
                  <li key={h.kind + h.id}>
                    <Link href={h.href} className="flex items-center gap-3 px-4 py-3 hover:bg-paper/60 sm:px-5">
                      <K.icon size={17} className="shrink-0 text-faint" aria-label={K.label} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{h.title}</span>
                      <span className="shrink-0 text-xs text-faint">{relativeTime(h.at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={Sparkles}>Tes discussions et contenus générés apparaîtront ici.</Empty>
          )}
        </Section>
      </div>
    </>
  );
}
