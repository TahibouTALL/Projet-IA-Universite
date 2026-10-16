// Fonctions IA de haut niveau, utilisées par les pages et les actions serveur
import { complete, parseJson, type AiMessage } from "./provider";
import type { ChunkHit } from "../search";

const BASE_STYLE = `Tu écris en français clair, pour des étudiants d'un établissement d'enseignement supérieur au Sénégal.
Tu utilises Markdown (titres ##, listes, tableaux si utile) et LaTeX entre $...$ ou $$...$$ pour les formules.
Tu ne fabriques ni citation, ni chiffre, ni source. Si une information te manque, tu le dis.`;

function contextBlock(hits: ChunkHit[]) {
  if (!hits.length) return "";
  const parts = hits.map((h, i) => `[Document ${i + 1} : ${h.title}]\n${h.content}`).join("\n\n---\n\n");
  return `\n\nExtraits des documents de l'établissement (à utiliser en priorité, et à citer par leur titre quand tu t'en sers) :\n\n${parts}`;
}

export type CourseParams = { topic: string; level: string; depth: "court" | "standard" | "approfondi"; extra?: string };

export async function generateCourse(p: CourseParams, hits: ChunkHit[]) {
  const length = { court: "environ 800 mots", standard: "environ 1 800 mots", approfondi: "environ 3 500 mots" }[p.depth];
  return complete({
    task: "course",
    maxTokens: p.depth === "approfondi" ? 8000 : 5000,
    system: `Tu es un enseignant expérimenté qui rédige des cours structurés. ${BASE_STYLE}${contextBlock(hits)}`,
    messages: [
      {
        role: "user",
        content: `SUJET : ${p.topic}
Niveau : ${p.level}
Longueur : ${length}
${p.extra ? `Consignes : ${p.extra}\n` : ""}
Rédige un cours complet avec : un titre (#), les objectifs, une introduction, des parties numérotées avec définitions, propriétés et exemples résolus, puis une section "À retenir".`,
      },
    ],
  });
}

export type ExerciseParams = {
  topic: string;
  level: string;
  count: number;
  difficulty: "facile" | "moyen" | "difficile" | "progressif";
  extra?: string;
};

export async function generateExercises(p: ExerciseParams, hits: ChunkHit[]) {
  const raw = await complete({
    task: "exercises",
    maxTokens: 7000,
    system: `Tu es un enseignant qui prépare des séries d'exercices avec corrections détaillées. ${BASE_STYLE}
Si des sujets d'examen ou de devoir figurent dans les extraits, inspire-toi de leur style et de leur niveau.${contextBlock(hits)}`,
    messages: [
      {
        role: "user",
        content: `SUJET : ${p.topic}
Niveau : ${p.level}
Nombre d'exercices : ${p.count}
Difficulté : ${p.difficulty}
${p.extra ? `Consignes : ${p.extra}\n` : ""}
Écris d'abord tous les énoncés (titres "## Exercice n"), sans aucune solution.
Puis écris une ligne contenant exactement ===CORRECTION===
Puis la correction détaillée de chaque exercice (titres "## Correction de l'exercice n"), étape par étape.`,
      },
    ],
  });
  const [exercises, ...rest] = raw.split(/^\s*={3}CORRECTION={3}\s*$/m);
  return { exercises: exercises.trim(), solution: rest.join("\n").trim() || null };
}

export type Slide = { title: string; points: string[]; notes?: string };
export type Deck = { title: string; subtitle?: string; slides: Slide[] };
export type PresentationParams = { topic: string; audience: string; slides: number; extra?: string };

export async function generatePresentation(p: PresentationParams, hits: ChunkHit[]): Promise<Deck> {
  const raw = await complete({
    task: "presentation",
    maxTokens: 6000,
    system: `Tu conçois des présentations pédagogiques. ${BASE_STYLE}
Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de la forme :
{"title": string, "subtitle": string, "slides": [{"title": string, "points": string[], "notes": string}]}
Chaque diapositive porte une seule idée, 2 à 5 points rédigés en phrases courtes, et des notes orales pour l'enseignant.
N'utilise pas de Markdown ni de LaTeX dans le JSON.${contextBlock(hits)}`,
    messages: [
      {
        role: "user",
        content: `SUJET : ${p.topic}
Public : ${p.audience}
Nombre de diapositives (hors titre) : ${p.slides}
${p.extra ? `Consignes : ${p.extra}` : ""}`,
      },
    ],
  });
  const deck = parseJson<Deck>(raw);
  deck.slides = (deck.slides ?? []).filter((s) => s && s.title).map((s) => ({
    title: String(s.title),
    points: Array.isArray(s.points) ? s.points.map(String) : [],
    notes: s.notes ? String(s.notes) : "",
  }));
  return deck;
}

export async function tutorReply(opts: {
  history: AiMessage[];
  courseTitle?: string;
  hits: ChunkHit[];
  studentName: string;
}) {
  return complete({
    task: "tutor",
    maxTokens: 3000,
    system: `Tu es un tuteur bienveillant et exigeant qui aide ${opts.studentName} à comprendre ses cours${
      opts.courseTitle ? ` de ${opts.courseTitle}` : ""
    }. ${BASE_STYLE}
Tu expliques pas à pas, avec des exemples, et tu vérifies la compréhension par une courte question à la fin.
Si l'étudiant demande la réponse d'un devoir à rendre, tu l'aides à raisonner sans faire le travail à sa place.
Sur demande, tu peux résumer un chapitre, proposer des exercices ou corriger une démarche.${contextBlock(opts.hits)}`,
    messages: opts.history.slice(-16),
  });
}

export async function chatTitle(firstMessage: string) {
  const t = await complete({
    task: "title",
    maxTokens: 30,
    system: "Donne un titre de 3 à 6 mots, en français, sans guillemets ni ponctuation finale, pour cette question d'étudiant.",
    messages: [{ role: "user", content: firstMessage }],
  });
  return t.replace(/["«»\n]/g, "").trim().slice(0, 60) || "Nouvelle discussion";
}
