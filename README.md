# Velora

Storefront multi-marchés en Cash on Delivery, dashboard admin, API. Mode masculine premium, Afrique de l'Ouest et Centrale.

- [Plan de développement](velora-dev-plan.md) — architecture, tracking, anti-fraude, 9 phases
- [Guide d'identité](design/README.md) — source de vérité de la marque
- [Brief d'identité visuelle](velora-brand-prompt.md)

## Démarrage

```bash
pnpm install
cp .env.example .env      # remplir les secrets
pnpm dev:storefront       # http://localhost:3000
pnpm dev:admin            # http://localhost:3001
pnpm dev:api              # http://localhost:4000
```

La base est un PostgreSQL en conteneur :

```bash
docker compose up -d
psql "postgresql://velora:velora@localhost:5450/velora" -f db/schema.sql
```

Le schéma est dans [`db/schema.sql`](db/schema.sql).

## Structure

```
apps/
  storefront/        Next.js 15 · /bj /ci /ga · tunnel COD
  admin/             Next.js 15 · file de commandes, scores
  api/               Express 5 · TypeScript
packages/
  design-system/     jetons CSS + règles de marque exécutables
  tracking/          event_id partagé, hachage PII, dédup Meta/TikTok
  fraud/             moteur de score — shadow mode par défaut
design/              guide d'identité + prototype (Claude Design)
db/                  schéma SQL + seed catalogue importé
scripts/             import-shopify-catalog.mjs
```

## Migration Shopify puis coupure

Objectif : tout rapatrier une fois, puis ne plus dépendre de Shopify. L'API
runtime est **indépendante de Shopify** ; toute la logique Shopify vit dans
`scripts/`, exécutée une seule fois.

**Catalogue** (public, sans identifiant) :

```bash
pnpm import:catalog          # défaut : jngiej-ax.myshopify.com
```

Aspire les produits, **télécharge les images en local**
(`apps/storefront/public/assets/shopify`, plus aucun lien vers le CDN Shopify)
et régénère `apps/storefront/lib/catalog.generated.json` + `db/seed-catalog.sql`.
Le storefront affiche les produits réels sur `/bj` et `/bj/produit/<slug>`.

**Commandes** (Admin API, token à usage unique) :

```bash
SHOPIFY_STORE_DOMAIN=... SHOPIFY_ADMIN_TOKEN=shpat_... pnpm migrate:orders
```

Importe tout l'historique dans `db/seed-orders.sql` (non versionné : il
contient des données clients), puis Shopify peut être coupé. Procédure de
création du token dans l'en-tête de
[`scripts/migrate-shopify-orders.mjs`](scripts/migrate-shopify-orders.mjs).
Après cette migration, les nouvelles commandes passent par le tunnel COD natif
de Velora, pas par Shopify.

## Vérification

```bash
pnpm typecheck && pnpm test && pnpm build
```

Le CI ajoute un garde-fou : `tokens.css` est régénéré depuis le guide d'identité et le build échoue si le fichier a été édité à la main.

## Trois décisions à connaître avant de contribuer

**L'anti-fraude ne bloque pas.** `FRAUD_ENFORCEMENT=shadow` par défaut : le moteur score et journalise, sans jamais refuser une commande. Les réseaux mobiles ouest-africains sont massivement en CGNAT — des milliers d'abonnés partagent une IP publique, et les bases de réputation classent souvent ces plages en proxy. Activer le blocage sans avoir observé la distribution réelle des scores revient à bannir de vrais clients, silencieusement : un client bloqué à tort ne se plaint pas, il part. Voir [`packages/fraud`](packages/fraud/src/index.ts).

**L'`event_id` est un UUID, pas le format du plan.** Le plan v1.0 (§4) spécifie `velora_{marché}_{orderId}_{eventName}_{timestamp}`. Ce format casse la déduplication qu'il est censé garantir : le timestamp diverge entre le navigateur et le serveur, et la majorité du funnel n'a pas d'`orderId`. L'implémentation génère un UUID côté serveur, partagé entre le pixel et CAPI. Voir [`packages/tracking`](packages/tracking/src/event-id.ts).

**Les pixels sont globaux.** Meta, TikTok et Snapchat utilisent un seul Pixel ID + Access Token pour tous les marchés. Ils vivent dans l'environnement, pas dans `market_config`.

## État — Phase 0

Fait : monorepo, design system extrait du guide, squelette API (helmet, zod, rate limiting, handler d'erreurs, `/health`), tunnel COD fonctionnel du produit à la confirmation, dashboard en lecture, schéma SQL, CI.

Catalogue réel importé de Shopify (produits, variantes, prix, images locales), storefront branché dessus, base Postgres en conteneur avec schéma appliqué.

Pas encore : persistance runtime (l'API ne lit pas encore la base, tout est en mémoire), envois CAPI réels, intégrations FingerprintJS / IPQualityScore / HLR, auth admin.
