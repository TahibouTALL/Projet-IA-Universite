"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendChatMessage } from "@/app/actions/ai";
import { Markdown } from "@/components/Markdown";
import { btn, cx } from "@/components/ui";
import type { ChatSource } from "@/db/schema";

type Msg = { id: string; role: "user" | "assistant"; content: string; sources?: ChatSource[] | null };

const SUGGESTIONS = [
  "Explique-moi ce chapitre comme si je le découvrais",
  "Fais-moi un résumé des points essentiels",
  "Donne-moi 3 exercices avec leur correction",
  "Vérifie ma démarche : ",
];

export function Chat({ sessionId, courseId, initial }: { sessionId: string | null; courseId: string | null; initial: Msg[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [sid, setSid] = useState(sessionId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initial);
    setSid(sessionId);
  }, [initial, sessionId]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages, pending]);

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
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex-1 space-y-6 pb-6">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <p className="mb-5 text-muted">Pose une question sur ton cours, ou commence par une suggestion.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => (s.endsWith(": ") ? setText(s) : send(s))} className={cx(btn.secondary, "rounded-full")}>
                  {s.replace(": ", "...")}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[95%]">
              <Markdown>{m.content}</Markdown>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span>Sources :</span>
                  {m.sources.map((s) => (
                    <a key={s.documentId} href={`/api/files/${s.documentId}`} target="_blank" className="rounded-full bg-stone-100 px-2 py-0.5 hover:text-accent">
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {pending && <div className="animate-pulse text-sm text-muted">L'IA réfléchit...</div>}
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-14 flex gap-2 border-t border-line bg-paper py-3 lg:bottom-0 lg:py-4"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
          rows={2}
          placeholder="Écris ta question..."
          className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <button type="submit" disabled={pending || !text.trim()} className={cx(btn.primary, "self-end")}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
