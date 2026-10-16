// Couche IA commune : un seul point d'entrée, quel que soit le fournisseur choisi dans .env
import { mockCompletion } from "./mock";

export type AiMessage = { role: "user" | "assistant"; content: string };
export type AiTask = "tutor" | "course" | "exercises" | "presentation" | "title";

export type CompletionRequest = {
  task: AiTask;
  system: string;
  messages: AiMessage[];
  maxTokens?: number;
  temperature?: number;
};

const PROVIDER = (process.env.AI_PROVIDER || "mock").toLowerCase();
const API_KEY = process.env.AI_API_KEY || "";
const BASE_URL = process.env.AI_BASE_URL || "";

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-5-mini",
  gemini: "gemini-2.5-flash",
  mock: "simulation",
};

export const aiModel = process.env.AI_MODEL || DEFAULT_MODELS[PROVIDER] || "";
export const aiProvider = PROVIDER;
export const aiIsSimulated = PROVIDER === "mock";

export class AiError extends Error {}

export async function complete(req: CompletionRequest): Promise<string> {
  const maxTokens = req.maxTokens ?? 4000;
  switch (PROVIDER) {
    case "anthropic":
      return anthropic(req, maxTokens);
    case "openai":
      return openai(req, maxTokens);
    case "gemini":
      return gemini(req, maxTokens);
    case "mock":
      return mockCompletion(req);
    default:
      throw new AiError(`Fournisseur IA inconnu : ${PROVIDER}`);
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Erreur IA ${res.status}:`, detail.slice(0, 500));
    throw new AiError(`Le service IA a répondu ${res.status}. Vérifie la clé et le modèle dans la configuration.`);
  }
  return res.json();
}

async function anthropic(req: CompletionRequest, maxTokens: number) {
  const data = await post(
    `${BASE_URL || "https://api.anthropic.com"}/v1/messages`,
    { "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    {
      model: aiModel,
      max_tokens: maxTokens,
      temperature: req.temperature ?? 0.4,
      system: req.system,
      messages: req.messages,
    },
  );
  return (data.content as { type: string; text?: string }[])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// Compatible avec OpenAI et toute API au même format (Ollama, vLLM, LM Studio, Mistral...)
async function openai(req: CompletionRequest, maxTokens: number) {
  const data = await post(
    `${BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
    API_KEY ? { authorization: `Bearer ${API_KEY}` } : {},
    {
      model: aiModel,
      max_completion_tokens: maxTokens,
      messages: [{ role: "system", content: req.system }, ...req.messages],
    },
  );
  return data.choices?.[0]?.message?.content ?? "";
}

async function gemini(req: CompletionRequest, maxTokens: number) {
  const base = BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const data = await post(
    `${base}/models/${encodeURIComponent(aiModel)}:generateContent`,
    { "x-goog-api-key": API_KEY },
    {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: req.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens, temperature: req.temperature ?? 0.4 },
    },
  );
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

/** Extrait un objet JSON d'une réponse de modèle (tolère les blocs ```json). */
export function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = fenced ? fenced[1] : raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new AiError("Réponse IA illisible, réessaie.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
