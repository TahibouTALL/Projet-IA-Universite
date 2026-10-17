"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, CircleAlert, FileText, Lightbulb, ListChecks, NotebookPen, ScanSearch } from "lucide-react";
import { sendChatMessage } from "@/app/actions/ai";
import { Markdown } from "@/components/Markdown";
import { cx } from "@/components/ui";
import type { ChatSource } from "@/db/schema";

type Msg = { id: string; role: "user" | "assistant"; content: string; sources?: ChatSource[] | null };

const SUGGESTIONS = [
  { icon: Lightbulb, text: "Explique-moi ce chapitre comme si je le découvrais" },
  { icon: NotebookPen, text: "Fais-moi un résumé des points essentiels" },
  { icon: ListChecks, text: "Donne-moi 3 exercices avec leur correction" },
  { icon: ScanSearch, text: "Vérifie ma démarche : ", fill: true },
];

function TutorAvatar({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="board flex shrink-0 items-center justify-center rounded-lg font-bold text-chalk"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      IA
    </span>
  );
}

export function Chat({
  sessionId,
  courseId,
  initial,
  scopeLabel,
  initialText = "",
}: {
  sessionId: string | null;
  courseId: string | null;
  initial: Msg[];
  scopeLabel: string;
  initialText?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [sid, setSid] = useState(sessionId);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(initial);
    setSid(sessionId);
  }, [initial, sessionId]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, pending]);

  // Zone de saisie qui grandit avec le texte
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  function send(content: string) {
    if (!content.trim() || pending) return;
    setError(null);
    setText("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content }]);
    start(async () => {
      const res = await sendChatMessage({ sessionId: sid, courseId, content });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessages((m) => [...m, { id: res.reply.id, role: "assistant", content: res.reply.content, sources: res.reply.sources }]);
      if (!sid) {
        setSid(res.sessionId);
        router.replace(`/ai/chat?session=${res.sessionId}`, { scroll: false });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-15rem)] flex-col lg:min-h-[calc(100vh-12rem)]">
      <div className="flex-1 space-y-6 pb-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl py-8 text-center sm:py-12">
            <div className="flex justify-center">
              <TutorAvatar size={48} />
            </div>
            <h2 className="mt-4 text-[1.35rem] font-bold text-ink">Que veux-tu comprendre aujourd'hui ?</h2>
            <p className="mt-1 text-md text-muted">Je m'appuie sur les documents de {scopeLabel}.</p>
            <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => {
                    if (s.fill) {
                      setText(s.text);
                      input.current?.focus();
                    } else send(s.text);
                  }}
                  className="flex items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-soft/40"
                >
                  <s.icon size={17} className="mt-px shrink-0 text-accent" aria-hidden />
                  {s.fill ? "Vérifie ma démarche..." : s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-md text-white">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <TutorAvatar />
              <div className="min-w-0 max-w-3xl flex-1 pt-0.5">
                <Markdown variant="chat">{m.content}</Markdown>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-faint">Sources :</span>
                    {m.sources.map((s) => (
                      <a
                        key={s.documentId}
                        href={`/api/files/${s.documentId}`}
                        target="_blank"
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent-strong"
                      >
                        <FileText size={13} className="shrink-0" aria-hidden />
                        <span className="truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="flex items-center gap-3" aria-live="polite">
            <TutorAvatar />
            <span className="typing" aria-label="L'IA rédige sa réponse">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
            <CircleAlert size={17} className="mt-px shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-1 bg-paper px-1 pb-3 pt-2 lg:bottom-0 lg:pb-6"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-white p-2 shadow-[0_4px_18px_-10px_rgb(18_51_43/0.25)] focus-within:border-accent">
          <textarea
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            rows={1}
            aria-label="Ta question"
            placeholder="Écris ta question..."
            className="max-h-42 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-md text-ink outline-none placeholder:text-faint/75"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={pending || !text.trim()}
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              text.trim() && !pending ? "bg-accent text-white hover:bg-accent-strong" : "bg-ink/[0.06] text-faint",
            )}
          >
            <ArrowUp size={19} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 hidden text-center text-xs text-faint sm:block">Entrée pour envoyer, Maj + Entrée pour aller à la ligne. Vérifie toujours avec ton cours.</p>
      </form>
    </div>
  );
}
