// Réponses simulées, pour tester la plateforme sans clé API (AI_PROVIDER=mock)
import { shorten } from "@/lib/format";
import type { CompletionRequest } from "./provider";

const NOTE = "> Réponse simulée : aucun fournisseur IA n'est configuré (AI_PROVIDER=mock).";

function topicOf(req: CompletionRequest) {
  const last = req.messages[req.messages.length - 1]?.content ?? "";
  const m = last.match(/SUJET\s*:\s*(.+)/i);
  return (m ? m[1] : last).split("\n")[0].slice(0, 120).trim() || "le sujet demandé";
}

export async function mockCompletion(req: CompletionRequest): Promise<string> {
  const topic = topicOf(req);
  switch (req.task) {
    case "title":
      return shorten(topic, 50);
    case "course":
      return `${NOTE}

# ${topic}

## Objectifs
À la fin de ce cours, l'étudiant sait définir les notions clés de ${topic} et les appliquer sur un cas simple.

## 1. Introduction
Cette partie situe ${topic} dans le programme et rappelle les prérequis.

## 2. Notions fondamentales
Une définition, une propriété, puis un exemple. Formule d'exemple : $E = mc^2$.

## 3. Application
Un exemple résolu pas à pas.

## À retenir
- Première idée clé
- Deuxième idée clé
`;
    case "exercises":
      return `${NOTE}

## Exercice 1
Énoncé simulé sur ${topic}.

## Exercice 2
Deuxième énoncé simulé.

===CORRECTION===

## Correction de l'exercice 1
Étapes de résolution simulées.

## Correction de l'exercice 2
Étapes de résolution simulées.
`;
    case "presentation":
      return JSON.stringify({
        title: topic,
        subtitle: "Présentation générée en mode simulation",
        slides: [
          { title: "Pourquoi ce sujet", points: ["Contexte du sujet", "Enjeux pour les étudiants"], notes: "" },
          { title: "Notions clés", points: ["Définition", "Propriété principale", "Exemple"], notes: "" },
          { title: "Application", points: ["Cas pratique", "Résultat attendu"], notes: "" },
          { title: "À retenir", points: ["Idée 1", "Idée 2", "Idée 3"], notes: "" },
        ],
      });
    case "tutor":
    default:
      return `${NOTE}

Voici comment je t'expliquerais « ${topic} » : je commence par l'idée générale, puis je donne un exemple concret, et je termine par une question pour vérifier que tu as compris. Une fois une clé API configurée, je m'appuierai aussi sur les documents de ton cours.`;
  }
}
