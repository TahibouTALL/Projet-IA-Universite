# Campus IA

Plateforme numérique d'établissement qui réunit, au même endroit, les cours, les documents, l'emploi du temps, les annonces et un assistant IA qui s'appuie sur les vrais documents de l'école.

Elle sert quatre publics :

| Rôle | Ce qu'il peut faire |
| --- | --- |
| **Enseignant** | Créer ses cours et y publier supports, devoirs (avec date limite) et annonces, comme sur Google Classroom. Générer un cours ou une présentation PowerPoint avec l'IA, puis les publier dans un cours en un clic. Valider les contributions des ambassadeurs pour ses cours. |
| **Étudiant** | Retrouver ses cours et documents classés par matière et par type (cours, TD, TP, examens, corrections...). Partager des documents avec sa classe. Discuter avec un tuteur IA qui explique le cours et cite ses sources, générer un cours, des exercices et leur correction (affichée à part). |
| **Administration** | Gérer les comptes, les rôles et les classes. Saisir ou importer l'emploi du temps (CSV). Publier des annonces pour toute l'école ou une classe. Suivre l'activité. |
| **Ambassadeur** | Étudiant volontaire qui dépose les documents de l'établissement (anciens sujets, devoirs, corrections, polycopiés). Après validation par l'enseignant, ces documents sont visibles par la classe et enrichissent les réponses de l'IA. |

## Comment l'IA utilise les documents

Chaque document déposé (PDF, Word, texte) est découpé en passages et indexé en plein texte dans PostgreSQL (dictionnaire français). Quand un étudiant pose une question ou demande des exercices, la plateforme retrouve les passages les plus pertinents dans les cours auxquels il a accès et les transmet au modèle. Les réponses du tuteur indiquent les documents utilisés.

Plus les ambassadeurs et enseignants déposent de documents de qualité, plus l'IA colle au programme réel de l'établissement.

## Choix techniques

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Application | Next.js 15 (App Router, TypeScript) | Un seul projet pour l'interface et le serveur, rendu côté serveur rapide, très répandu. |
| Base de données | PostgreSQL 16 + Drizzle ORM | Robuste, gratuit, recherche plein texte intégrée, passe à l'échelle. Drizzle est 100 % TypeScript, sans binaire natif. |
| Authentification | NextAuth (identifiants email + mot de passe) | Simple à déployer ; extensible vers Google, Microsoft ou le SSO de l'université. |
| Fichiers | Disque local (volume Docker) | Zéro dépendance pour le prototype ; le module `src/lib/storage.ts` se remplace par S3 ou MinIO sans toucher au reste. |
| IA | Couche commune Claude, OpenAI, Gemini ou serveur local | Le fournisseur se choisit dans `.env`. Compatible avec Ollama ou vLLM pour faire tourner un modèle sur les serveurs de l'école. |
| Déploiement | Docker Compose | Une commande sur un serveur de l'université. |

## Démarrage rapide (développement)

Prérequis : Node.js 22 et PostgreSQL 16 (ou Docker).

```bash
git clone https://github.com/TahibouTALL/Projet-IA-Universite.git
cd Projet-IA-Universite
npm install
cp .env.example .env            # puis ajuster DATABASE_URL et NEXTAUTH_SECRET

# Base de données locale avec Docker (si PostgreSQL n'est pas installé)
docker run -d --name campus-db -e POSTGRES_USER=campus -e POSTGRES_PASSWORD=campus \
  -e POSTGRES_DB=campus -p 5432:5432 postgres:16-alpine

npm run db:migrate              # crée les tables
npm run db:seed                 # données de démonstration fictives
npm run dev                     # http://localhost:3000
```

### Comptes de démonstration (données fictives)

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administration | admin@campus.test | admin1234 |
| Enseignant | prof.diop@campus.test | demo1234 |
| Enseignant | prof.sarr@campus.test | demo1234 |
| Étudiant | etudiant@campus.test | demo1234 |
| Ambassadeur | ambassadeur@campus.test | demo1234 |

Sans clé API, l'IA tourne en **mode simulation** (`AI_PROVIDER=mock`) : toutes les fonctions sont utilisables mais les réponses sont des exemples, clairement signalés comme tels.

## Déploiement sur un serveur de l'université

Sur une machine Linux avec Docker :

```bash
git clone https://github.com/TahibouTALL/Projet-IA-Universite.git
cd Projet-IA-Universite
cp .env.example .env
```

Dans `.env`, renseigner au minimum :

- `NEXTAUTH_SECRET` : une valeur aléatoire (`openssl rand -base64 32`)
- `NEXTAUTH_URL` : l'adresse publique, par exemple `https://campus.ept.sn`
- `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` : le premier compte administrateur
- `POSTGRES_PASSWORD` : un mot de passe solide
- `ALLOWED_EMAIL_DOMAIN` : par exemple `ept.sn` pour limiter l'inscription aux adresses de l'école
- la configuration IA (voir plus bas)

Puis :

```bash
docker compose up -d --build
```

La base est migrée et le compte administrateur créé automatiquement au premier lancement. L'application écoute sur le port 3000 ; placer devant un reverse proxy (Nginx, Caddy, Traefik) pour le HTTPS.

Premiers pas après installation : se connecter en administrateur, créer les classes, créer les comptes enseignants, puis communiquer le lien d'inscription aux étudiants. L'administration promeut ensuite les étudiants volontaires au rôle d'ambassadeur.

**Sauvegardes** : deux volumes Docker contiennent toutes les données, `pgdata` (base) et `uploads` (fichiers). Exemple de sauvegarde de la base :

```bash
docker compose exec db pg_dump -U campus campus > sauvegarde-$(date +%F).sql
```

## Configuration de l'IA

| Fournisseur | Variables |
| --- | --- |
| Claude (Anthropic) | `AI_PROVIDER=anthropic`, `AI_API_KEY=...`, `AI_MODEL` facultatif (par défaut `claude-sonnet-5-5`) |
| OpenAI | `AI_PROVIDER=openai`, `AI_API_KEY=...`, `AI_MODEL=...` |
| Gemini | `AI_PROVIDER=gemini`, `AI_API_KEY=...`, `AI_MODEL` facultatif (par défaut `gemini-2.5-flash`) |
| Modèle local (Ollama, vLLM, LM Studio) | `AI_PROVIDER=openai`, `AI_BASE_URL=http://serveur:11434/v1`, `AI_MODEL=nom-du-modele`, clé vide |
| Simulation | `AI_PROVIDER=mock` |

Vérifier sur le site du fournisseur que le nom de modèle choisi est toujours proposé. La page Administration affiche le fournisseur actif.

## Format d'import de l'emploi du temps

Fichier CSV (séparateur `;` ou `,`), une ligne par créneau, en-tête facultatif :

```
jour;debut;fin;intitule;salle;enseignant
Lundi;08:00;10:00;Résistance des matériaux;Amphi A;Awa Diop
Mercredi;14h00;16h00;RO302;Salle 12;Ousmane Sarr
```

L'intitulé est rattaché au cours de la classe s'il correspond à son titre ou à son code. Un tableau Excel enregistré au format CSV convient.

## Structure du projet

```
src/
  app/
    (app)/            pages connectées : tableau de bord, cours, documents,
                      emploi du temps, annonces, IA, ambassadeur, modération, admin
    actions/          actions serveur (cours, administration, IA)
    api/              téléchargement sécurisé des fichiers, export PowerPoint, auth
    login, register   connexion et inscription
  components/         interface réutilisable
  db/                 schéma Drizzle, migrations, données de démonstration
  lib/
    access.ts         règles d'accès par rôle
    ai/               couche fournisseur, prompts, export PowerPoint, simulation
    documents.ts      dépôt et indexation des documents
    extract.ts        extraction de texte (PDF, Word, texte)
    search.ts         recherche plein texte pour l'IA
    storage.ts        stockage des fichiers
drizzle/              migrations SQL versionnées
```

Commandes utiles :

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | version de production |
| `npm run typecheck` | vérification des types |
| `npm run db:generate` | générer une migration après modification de `src/db/schema.ts` |
| `npm run db:migrate` | appliquer les migrations |
| `npm run db:seed` | données de démonstration (`--admin-only` pour seulement l'administrateur) |
| `npm run db:studio` | explorer la base dans le navigateur |

## Règles d'accès

- Un étudiant ou un ambassadeur ne voit que les cours de sa classe ; un enseignant voit ses propres cours ; l'administration voit tout.
- Les fichiers ne sont jamais servis publiquement : chaque téléchargement vérifie le compte et le cours.
- Les contributions d'ambassadeurs restent invisibles et hors de l'IA tant qu'elles ne sont pas validées.
- L'inscription publique ne crée que des comptes étudiants ; les autres rôles sont attribués par l'administration.
- Le rôle est relu en base à chaque requête : un changement de rôle prend effet immédiatement.

## Feuille de route pour passer à l'échelle

1. **Recherche sémantique** : ajouter l'extension `pgvector` et des embeddings aux passages, en complément de la recherche plein texte.
2. **Réponses en streaming** dans le tuteur, pour un affichage mot à mot.
3. **Stockage objet** (MinIO sur site ou S3) et file de traitement pour l'indexation des gros documents et l'OCR des scans.
4. **Connexion unique** avec les comptes de l'université (Google Workspace, Microsoft 365 ou LDAP).
5. **Notifications** par email ou WhatsApp pour les annonces et les devoirs.
6. **Quotas IA** par utilisateur et tableau de bord d'usage pour maîtriser les coûts.
7. **Application mobile** (PWA) et mode hors ligne pour consulter les documents.

## Licence

À définir par l'équipe du projet.
