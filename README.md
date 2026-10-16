# Campus IA

Plateforme numérique d'établissement qui réunit, au même endroit, les cours, les documents, l'emploi du temps, les annonces et un assistant IA qui s'appuie sur les vrais documents de l'école.

Elle sert quatre publics :

| Rôle | Ce qu'il peut faire |
| --- | --- |
| **Enseignant** | Créer ses cours et y publier supports, devoirs (avec date limite) et annonces, comme sur Google Classroom. Générer un cours ou une présentation PowerPoint avec l'IA, puis les publier dans un cours en un clic. Consulter et compléter la base de connaissances de l'IA pour ses cours. |
| **Étudiant** | Retrouver ses cours et documents classés par matière et par type (cours, TD, TP, examens, corrections...). Partager des documents avec sa classe. Discuter avec un tuteur IA qui explique le cours et cite ses sources, générer un cours, des exercices et leur correction (affichée à part). |
| **Administration** | Gérer les comptes, les rôles et les classes. Saisir ou importer l'emploi du temps (CSV). Publier des annonces pour toute l'école ou une classe. Suivre l'activité. |
| **Ambassadeur** | Étudiant volontaire qui dépose les documents de l'établissement (anciens sujets, devoirs, corrections, polycopiés). Ces documents ne sont pas publiés : ils servent uniquement de contexte à l'IA, qui les utilise dès le dépôt. Les enseignants du cours peuvent les consulter et les retirer. |

## Comment l'IA utilise les documents

Chaque document déposé (PDF, Word, texte) est découpé en passages et indexé en plein texte dans PostgreSQL (dictionnaire français). Quand un étudiant pose une question ou demande des exercices, la plateforme retrouve les passages les plus pertinents dans les cours auxquels il a accès et les transmet au modèle. Les réponses du tuteur indiquent les documents utilisés.

Plus les ambassadeurs et enseignants déposent de documents de qualité, plus l'IA colle au programme réel de l'établissement. Les documents de la « base de l'IA » restent invisibles pour les étudiants : l'IA s'en inspire et peut citer leur titre, mais personne d'autre que leur auteur et les enseignants du cours ne peut les ouvrir.

## Choix techniques

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Application | Next.js 15 (App Router, TypeScript) | Un seul projet pour l'interface et le serveur, rendu côté serveur rapide, très répandu. |
| Base de données | PostgreSQL 16 + Drizzle ORM | Robuste, gratuit, recherche plein texte intégrée, passe à l'échelle. Drizzle est 100 % TypeScript, sans binaire natif. |
| Authentification | NextAuth (identifiants email + mot de passe) | Simple à déployer ; extensible vers Google, Microsoft ou le SSO de l'université. |
| Fichiers | Disque local (Docker) ou stockage compatible S3 | Disque local sur un serveur de l'école ; Supabase Storage, Cloudflare R2 ou MinIO pour un hébergement en ligne (`STORAGE_DRIVER=s3`). |
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

## Mettre en ligne gratuitement (Vercel + Supabase)

Pour obtenir un lien public du type `campus-ia.vercel.app`, sans serveur à gérer et sans carte bancaire :

- **Supabase** fournit la base PostgreSQL et le stockage des fichiers déposés ;
- **Vercel** fait tourner l'application.

Compter une trentaine de minutes la première fois.

### 1. Supabase : base de données et stockage

1. Créer un compte sur [supabase.com](https://supabase.com) (le plus simple : « Continue with GitHub »).
2. **New project** : nom `campus-ia`, un mot de passe de base de données solide (le noter, il servira plus bas), région **Central EU (Frankfurt)**.
3. Une fois le projet prêt, cliquer sur **Connect** en haut de la page et copier deux adresses, en remplaçant `[YOUR-PASSWORD]` par le mot de passe choisi :
   - **Transaction pooler** (port 6543) : pour Vercel ;
   - **Session pooler** (port 5432) : pour créer les tables depuis ton ordinateur.
4. Menu **Storage** : **New bucket**, nom `campus-ia`, laisser **Public bucket** désactivé.
5. Menu **Storage**, puis **S3** (configuration S3) : noter l'**Endpoint** et la **Region**, puis **New access key** et noter l'**Access key ID** et le **Secret access key** (le secret ne s'affiche qu'une fois).

### 2. Créer les tables et le compte administrateur

Depuis le dossier du projet sur ton ordinateur, dans l'Invite de commandes (`cmd`), avec l'adresse **Session pooler** :

```
set "DATABASE_URL=postgresql://postgres.xxxx:MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
set "SEED_ADMIN_EMAIL=ton.email@ept.sn"
set "SEED_ADMIN_PASSWORD=un-mot-de-passe-solide"
npm run db:migrate
npm run db:seed -- --admin-only
```

Les guillemets autour de chaque `set` évitent les problèmes si le mot de passe contient des caractères spéciaux. Ne pas utiliser les données de démonstration en ligne : leurs mots de passe sont publics dans ce README.

### 3. Vercel : l'application

1. Créer un compte sur [vercel.com](https://vercel.com) avec **Continue with GitHub**.
2. **Add New**, puis **Project**, puis **Import** sur le dépôt `Projet-IA-Universite`.
3. Ouvrir **Environment Variables** et coller le bloc suivant (Vercel accepte un collage de plusieurs lignes), après avoir remplacé les valeurs :

```
NEXT_PUBLIC_APP_NAME=Campus IA
DATABASE_URL=adresse Transaction pooler (port 6543)
DB_POOL_MAX=3
NEXTAUTH_SECRET=une longue suite de caractères au hasard
ALLOWED_EMAIL_DOMAIN=ept.sn
STORAGE_DRIVER=s3
S3_ENDPOINT=https://xxxx.storage.supabase.co/storage/v1/s3
S3_REGION=eu-central-1
S3_BUCKET=campus-ia
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
MAX_UPLOAD_MB=4
AI_PROVIDER=groq
AI_API_KEY=gsk_...
```

4. Cliquer sur **Deploy**. Après deux ou trois minutes, Vercel affiche l'adresse du site.
5. Ajouter une dernière variable `NEXTAUTH_URL` avec cette adresse (par exemple `https://campus-ia.vercel.app`), puis **Deployments**, les trois points du dernier déploiement, **Redeploy**.
6. Dans **Settings**, puis **Functions**, choisir la région **Frankfurt (fra1)**, la plus proche de la base Supabase.

Ouvrir le lien, se connecter avec le compte administrateur, créer les classes et les comptes enseignants : la plateforme est en ligne. Chaque `git push` sur `main` redéploie automatiquement.

### Limites de cette solution gratuite

- **Fichiers de 4 Mo maximum** : Vercel limite la taille des requêtes. Pour des fichiers plus lourds, passer sur le serveur de l'université (Docker) ou ajouter un envoi direct vers le stockage.
- **Supabase met en pause** un projet gratuit inactif pendant une semaine ; il se réactive depuis le tableau de bord Supabase. Offre gratuite : 500 Mo de base et 1 Go de fichiers.
- **Groq gratuit** : nombre de requêtes IA limité par jour (voir plus bas).
- L'offre gratuite de Vercel est prévue pour un usage non commercial : parfaite pour un pilote, à revoir pour un déploiement officiel.

## Configuration de l'IA

### Démarrer gratuitement avec Groq (recommandé)

1. Créer un compte sur [console.groq.com](https://console.groq.com) (email ou compte Google, sans carte bancaire).
2. Aller dans **API Keys** et cliquer sur **Create API Key**, puis copier la clé (elle commence par `gsk_`).
3. Dans `.env` :

```bash
AI_PROVIDER="groq"
AI_API_KEY="gsk_..."
AI_MODEL=""            # vide = openai/gpt-oss-120b
```

4. Redémarrer l'application. La page Administration doit afficher « groq ».

L'offre gratuite de Groq est limitée en nombre de requêtes par minute et par jour, pour toute l'organisation. C'est suffisant pour un pilote avec une ou deux classes, pas pour toute l'université ; les limites à jour sont dans la console Groq. Quand la limite est atteinte, la plateforme affiche un message clair au lieu d'une erreur.

### Autres fournisseurs

| Fournisseur | Variables | Remarques |
| --- | --- | --- |
| Groq | `AI_PROVIDER=groq`, `AI_API_KEY` | Gratuit avec limites. Modèle par défaut `openai/gpt-oss-120b`. |
| OpenRouter | `AI_PROVIDER=openrouter`, `AI_API_KEY`, `AI_MODEL` (un modèle se terminant par `:free`) | Modèles gratuits très limités par jour ; certains fournisseurs amont peuvent réutiliser les données. |
| Gemini | `AI_PROVIDER=gemini`, `AI_API_KEY`, `AI_MODEL` (un modèle Flash proposé dans Google AI Studio) | Offre gratuite, mais Google peut utiliser les échanges pour améliorer ses produits : à éviter avec des données d'étudiants. |
| Claude (Anthropic) | `AI_PROVIDER=anthropic`, `AI_API_KEY`, `AI_MODEL` facultatif (`claude-sonnet-5-5`) | Payant, très bonne qualité en français et en rédaction. |
| OpenAI | `AI_PROVIDER=openai`, `AI_API_KEY`, `AI_MODEL` | Payant. |
| Modèle local (Ollama, vLLM, LM Studio) | `AI_PROVIDER=openai`, `AI_BASE_URL=http://serveur:11434/v1`, `AI_MODEL`, clé vide | Gratuit et les données restent à l'école, mais demande un serveur avec carte graphique. |
| Simulation | `AI_PROVIDER=mock` | Réponses d'exemple, pour tester sans clé. |

Les offres gratuites changent souvent : vérifier les conditions sur le site du fournisseur avant un déploiement à grande échelle.

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
                      emploi du temps, annonces, IA, ambassadeur, base de l'IA, admin
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
- Les documents de la base de l'IA (dépôts des ambassadeurs) ne sont jamais listés ni téléchargeables par les étudiants.
- L'inscription publique ne crée que des comptes étudiants ; les autres rôles sont attribués par l'administration.
- Le rôle est relu en base à chaque requête : un changement de rôle prend effet immédiatement.

## Feuille de route pour passer à l'échelle

1. **Recherche sémantique** : ajouter l'extension `pgvector` et des embeddings aux passages, en complément de la recherche plein texte.
2. **Réponses en streaming** dans le tuteur, pour un affichage mot à mot.
3. **Envoi direct des fichiers** vers le stockage (au-delà de 4 Mo sur Vercel) et file de traitement pour l'indexation des gros documents et l'OCR des scans.
4. **Connexion unique** avec les comptes de l'université (Google Workspace, Microsoft 365 ou LDAP).
5. **Notifications** par email ou WhatsApp pour les annonces et les devoirs.
6. **Quotas IA** par utilisateur et tableau de bord d'usage pour maîtriser les coûts.
7. **Application mobile** (PWA) et mode hors ligne pour consulter les documents.

## Licence

À définir par l'équipe du projet.
