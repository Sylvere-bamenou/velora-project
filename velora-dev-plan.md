# VELORA — Plan de Développement Complet

**Mode Masculine Premium · Afrique**
Storefront Multi-marchés · Tracking Parfait · Anti-fraude · Contre-attaques

> Version 1.0 · Juillet 2025 · Confidentiel

---

## Sommaire

1. [Vision & Architecture globale](#1-vision--architecture-globale)
2. [Stack technique recommandée](#2-stack-technique-recommandée)
3. [Architecture multi-marchés](#3-architecture-multi-marchés)
4. [Système de tracking — Meta & TikTok](#4-système-de-tracking--meta--tiktok)
5. [Panier multi-produits & variantes](#5-panier-multi-produits--variantes)
6. [Système anti-fraude — Détection 4 couches](#6-système-anti-fraude--détection-4-couches)
7. [Système anti-fraude — Contre-attaques actives](#7-système-anti-fraude--contre-attaques-actives)
8. [Dashboard admin COD](#8-dashboard-admin-cod)
9. [Plan de développement — 9 phases](#9-plan-de-développement--9-phases)
10. [Budget & ressources estimés](#10-budget--ressources-estimés)

---

## 1. Vision & Architecture globale

Velora est un e-commerce premium mode masculine ciblant l'Afrique de l'Ouest et Centrale, opérant en Cash on Delivery (COD) pur. L'architecture est conçue pour être multi-marchés dès le premier jour, extensible sans duplication de code, et optimisée pour la conversion COD avec un tracking publicitaire de niveau entreprise et un système anti-fraude actif.

### Principes fondateurs

- Un seul codebase sert tous les marchés — ajouter un pays = créer une config en base, pas redéployer
- Chaque marché a son URL dédié : `velora.com/bj` · `velora.com/ci` · `velora.com/ga`
- `velora.com` = page d'entrée avec sélection de marché et détection IP automatique
- Un backend API central répond à tous les storefronts avec configs par marché
- Un dashboard admin unique pour gérer l'ensemble des opérations simultanément
- Transition progressive depuis Shopify — aucune interruption de ventes

### Plan de transition Shopify → Custom

| Étape | Horizon | Description |
|---|---|---|
| **Court terme** | Maintenant → 6 mois | Shopify reste actif, dashboard COD custom connecté via API Shopify |
| **Moyen terme** | 6 – 12 mois | Storefront custom déployé pour le Bénin, tests de conversion en parallèle |
| **Long terme** | 12 – 18 mois | Migration complète, Shopify coupé, autres marchés ajoutés un par un |

---

## 2. Stack technique recommandée

Stack choisie pour minimiser la complexité opérationnelle, maximiser la performance en Afrique (faible latence, CDN), et rester accessible à une équipe de taille modeste.

| Couche | Technologie | Justification |
|---|---|---|
| Storefront | Next.js 15 App Router | Routes `/bj` `/ci` `/ga` natives, SSR pour SEO, React Server Components, optimisé Edge |
| Backend API | Node.js + Express 5 | Écosystème de middlewares le plus large de Node, stack universellement connue (recrutement freelance facile), gestion native des erreurs async depuis la v5 |
| Base de données | PostgreSQL via Supabase | Gratuit pour démarrer, Row Level Security natif, auth intégrée, scale horizontal |
| Cache / Bans | Upstash Redis | Serverless, compatible Edge/Middleware Next.js, vérifications ban < 1ms par requête |
| Dashboard admin | Next.js + Shadcn/ui | Même stack que le storefront, déploiement séparé sur `admin.velora.com` |
| Storage médias | Cloudflare R2 | Pas de frais d'egress, CDN mondial inclus, API compatible S3, très économique |
| Hébergement front | Vercel | Edge Network mondial, déploiements automatiques depuis GitHub, analytics intégrés |
| Hébergement API | Railway | Déploiement Docker simple, scaling automatique, logs temps réel, prix prévisible |
| Device Fingerprint | FingerprintJS Pro | Identification hardware résistante VPN/navigation privée/antidetect, 99.5% précision |
| Détection VPN/IP | IPQualityScore | Meilleure couverture Afrique, détecte VPN + Proxy + Tor, fraud score 0–100 |
| Validation tél. | Africa's Talking HLR | Fait pour l'Afrique, lookup numéro actif/mobile/VoIP, SMS OTP, coverage BJ/CI/GA |
| Session recording | rrweb (open source) | Enregistrement sessions suspectes/honeypot, aucun coût, hébergé chez toi |
| Event queue | pg-boss ou Inngest | Retry automatique CAPI si échec, ordre garanti, idempotency par `event_id` |
| Monitoring | Sentry + PostHog | Erreurs temps réel + analytics comportementaux, plans gratuits disponibles |

### Briques complémentaires côté API Express

Express est volontairement minimaliste : plusieurs fonctions fournies nativement par d'autres frameworks doivent être ajoutées explicitement. Ces choix sont structurants et à poser dès la Phase 0.

| Besoin | Brique | Rôle |
|---|---|---|
| Temps réel dashboard | `ws` (ou Socket.IO) | Push des nouvelles commandes et changements de statut vers le dashboard — non inclus dans Express |
| Validation des entrées | `zod` + middleware | Validation stricte de chaque payload (commande, webhook, config marché) — première ligne de défense anti-fraude |
| En-têtes de sécurité | `helmet` | CSP, HSTS, protections headers par défaut |
| Rate limiting | `express-rate-limit` + store Redis Upstash | Limite par IP/device, partagé entre instances — base technique du tarpit (§7) |
| Typage & structure | TypeScript + routers par domaine | `routes/orders`, `routes/tracking`, `routes/fraud`, `routes/markets` |

> **Note CGNAT** : le rate limiting par IP doit être calibré avec prudence — les réseaux mobiles ouest-africains partagent massivement les IP publiques entre abonnés (voir §6).

---

## 3. Architecture multi-marchés

Chaque marché est une configuration en base de données, pas une instance séparée du code. Ajouter un nouveau pays revient à créer une ligne `market_config` et configurer les intégrations locales. Aucun déploiement supplémentaire n'est requis.

### Configuration par marché stockée en base

| Paramètre | Détail |
|---|---|
| **Devise & symbole** | XOF pour Bénin et CI · XAF pour Gabon · extensible |
| **Meta Pixel** | Pixel ID + Access Token — partagés par tous les marchés (configuration globale, pas par marché) |
| **TikTok Pixel** | Pixel ID + Access Token — partagés par tous les marchés (configuration globale, pas par marché) |
| **Snapchat Pixel** | Pixel ID + Access Token — partagés par tous les marchés (configuration globale, pas par marché) |
| **WhatsApp** | Numéro dédié avec préfixe international par marché |
| **Livreurs** | Liste des transporteurs locaux et leurs APIs |
| **Délais livraison** | Affichage localisé (ex : 24–48h Cotonou vs 3–5j Parakou) |
| **Frais de port** | Par zone géographique, seuil livraison gratuite optionnel |
| **Opérateurs télécom** | Préfixes valides Orange/MTN/Moov par pays |
| **Langue & tonalité** | Français standard vs expressions locales par marché |

### Toggles tracking & anti-fraude par marché

Tous configurables depuis le dashboard admin, sans toucher au code :

- `submission_event` : Lead OU Purchase à la soumission (configurable)
- `send_purchase_on_delivery` : envoyer Purchase CAPI quand le livreur marque livré
- `require_otp` : activer la vérification SMS OTP pour les commandes suspectes
- `vpn_action` : bloquer direct OU ajouter points au score de risque
- `max_orders_per_ip_24h` : nombre maximum de commandes par IP sur 24h
- `order_amount_review_threshold` : seuil montant déclenchant vérification manuelle
- `auto_blacklist_score` : score à partir duquel le ban est automatique

---

## 4. Système de tracking — Meta & TikTok

Chaque événement est envoyé en double : côté browser (pixel JavaScript) et côté serveur (CAPI), avec déduplication parfaite garantie par un `event_id` unique partagé. Aucun doublon, aucune perte d'événement même si le browser bloque les cookies.

### Règles fondamentales

- Un `event_id` unique généré côté serveur pour chaque événement avant envoi
- Format : `velora_{marché}_{orderId}_{eventName}_{timestamp}`
- Le même `event_id` est passé au pixel browser ET à CAPI — Meta et TikTok déduplication automatiquement
- Tous les PII hachés SHA256 avant envoi CAPI : téléphone, nom, prénom, ville, pays, `external_id`
- `fbp`, `fbc`, `ttp`, `ttclid` capturés dès la première visite et persistés avec chaque commande en base
- Event log en base : chaque envoi loggé avec statut (`pending` / `sent` / `failed`) pour retry
- Queue avec retry automatique si CAPI échoue — idempotency garantie par `event_id`

### Funnel complet des événements

| Événement | Déclencheur | Mode | Plateformes |
|---|---|---|---|
| `PageView` | Chaque chargement de page | Browser + CAPI optionnel | Meta · TikTok |
| `Search` | Recherche dans le catalogue | Browser uniquement | Meta · TikTok |
| `ViewContent` | Vue page produit | Browser + CAPI | Meta · TikTok |
| `ViewContent` | Changement de variante (re-fire) | Browser uniquement | Meta · TikTok |
| `AddToCart` | Ajout au panier (variante + quantité) | Browser + CAPI | Meta · TikTok |
| `ViewCart` | Ouverture et modification du panier | Browser uniquement | Meta · TikTok |
| `InitiateCheckout` | Début remplissage formulaire COD | Browser + CAPI | Meta · TikTok |
| `Lead ou Purchase` ① | Soumission commande (configurable) | Browser + CAPI | Meta · TikTok |
| `Custom: Confirmed` | Confirmation téléphonique par agent | CAPI uniquement | Meta · TikTok |
| `Purchase` ② toggle | Livraison confirmée par livreur | CAPI uniquement | Meta · TikTok |
| `Custom: Returned` | Retour ou refus à la porte | CAPI uniquement | Meta · TikTok |
| `Custom: FraudDetected` | Commande frauduleuse confirmée | CAPI uniquement | Meta · TikTok |

> ① configurable par marché dans le dashboard : Lead OU Purchase selon stratégie
> ② toggle ON/OFF par marché — Purchase envoyé seulement si livraison physique confirmée

### Données utilisateur & matching

| Champ | Traitement |
|---|---|
| `ph` (téléphone) | Normalisé E.164 puis SHA256 — signal de matching le plus fort |
| `fn` (prénom) | Minuscules, sans accents, puis SHA256 |
| `ln` (nom) | Minuscules, sans accents, puis SHA256 |
| `ct` (ville) | Minuscules, puis SHA256 |
| `country` (pays) | Code ISO 2 lettres, puis SHA256 (`bj`, `ci`, `ga`) |
| `external_id` | SHA256 de l'`order_id` — lie commande et événement dans Meta |
| `fbp` | Cookie Meta `_fbp` — capturé dès visite, persisté avec commande |
| `fbc` | Paramètre `fbclid` de l'URL — capturé et persisté |
| `ttp` | Cookie TikTok `_ttp` — équivalent `fbp` pour TikTok |
| `ttclid` | Paramètre TikTok de l'URL — équivalent `fbc` |
| IP | Envoyée en clair — pas de hachage requis |
| User-Agent | Envoyé en clair — pas de hachage requis |

---

## 5. Panier multi-produits & variantes

Le panier supporte plusieurs produits simultanément, chacun avec ses propres variantes et offres. Les prix et stocks sont figés au moment de la soumission (snapshot) pour garantir la cohérence pendant la confirmation téléphonique.

### Structure des variantes

- Chaque produit a un ou plusieurs SKU correspondant à chaque combinaison de variantes
- Variantes supportées : couleur (Noir/Or, Argent), taille (S/M/L/XL, 40/42mm), pack (x1, x3, x5)
- Chaque variante a son propre prix, stock, images et état de disponibilité
- Le `variantId` est utilisé dans tous les événements tracking (`contents[]` de Meta et TikTok)
- Changement de variante = re-fire `ViewContent` avec nouvel `event_id` et nouveau prix

### Offres et bundles

- **Bundle** : achat de plusieurs articles avec remise (ex : Pack 3 montres = -15%)
- **Quantity discount** : remise automatique selon quantité (2 achetés = -10%, 3 = -20%)
- **Free gift** : produit offert à partir d'un certain montant de commande
- Toutes les offres stockées en base, configurables depuis le dashboard par marché
- La remise appliquée est reflétée dans le champ `value` des événements tracking

### Persistance et snapshot

- Panier persisté en cookie (`cart_id`) et en base côté serveur
- Survit à la fermeture du navigateur — le client retrouve son panier
- `fbp`, `fbc`, `ttp`, `ttclid` liés au `cart_id` dès la première visite pour CAPI différé
- À la soumission : snapshot figé — prix et stocks ne peuvent plus changer
- L'agent de confirmation voit exactement le snapshot du client

---

## 6. Système anti-fraude — Détection 4 couches

Le système s'exécute à chaque soumission de commande et à chaque accès au site. Les 4 couches s'additionnent pour produire un score de risque global 0–100. Chaque couche est configurable par marché depuis le dashboard.

### Couche 1 — Vérification IP & réseau (IPQualityScore)

- Détecte VPN, Proxy, Tor, datacenter hosting — score de fraude 0–100 par IP
- Blocage immédiat Tor : +100 → block direct
- VPN détecté : +55 points (configurable : blocage direct ou flag selon marché)
- IP hors pays du marché commandé : +20 points
- Fraud score IPQualityScore > 75 : +30 points supplémentaires

### Couche 2 — Device Fingerprint (FingerprintJS Pro + composite maison)

- FingerprintJS Pro : identification hardware, `visitorId` stable à 99.5% cross-session
- Résiste à la navigation privée, au vidage de cookies, au changement de navigateur
- Fingerprint composite maison en backup : `SHA256(GPU + timezone + audio + résolution)`
- Les deux identifiants stockés avec chaque commande et vérifiés en Redis < 1ms
- Si l'un des deux est banni : accès site bloqué avant chargement de la page

### Couche 3 — Détection navigateur antidetect & manipulation

- **Canvas randomization** : dessin du canvas deux fois — résultats différents = bruit injecté détecté
- **WebGL incohérent** : combinaisons GPU vendor/renderer impossibles en conditions réelles
- **User-Agent vs capacités** : UA mobile mais comportement desktop
- **Performance timing** : VMs et navigateurs headless ont des timings anormaux (< 5ms ou > 2s)
- **Détection automatique** : Playwright, Puppeteer, Selenium, PhantomJS via `navigator.webdriver`
- 2 signaux ou plus = blocage ou OTP selon score global

### Couche 4 — Validation téléphone HLR Lookup

- Format E.164 strict par marché : préfixes Orange/MTN/Moov acceptés uniquement
- HLR Lookup via Africa's Talking : vérifie que le numéro est actif et mobile
- Numéros VoIP et virtuels (Receive-SMS) : blocage automatique
- SIM inactive ou éteinte : flag pour vérification manuelle par agent
- Opérateur incohérent avec le marché : +25 points au score de risque

### Moteur de score de risque & décision

| Score | Décision |
|---|---|
| `< 30` | ✅ Commande acceptée automatiquement — flux normal COD |
| `30 – 70` | ⚠️ File de vérification manuelle — appel prioritaire par agent |
| `> 70` | 🚫 Blocage automatique + suggestion de blacklist dans dashboard |
| `> 85` | 🚫 Blacklist automatique sans intervention humaine |
| Whitelist | ✅ Client fidèle — bypass total du système de score (score forcé 0) |

### Bannissement accès site — Middleware Next.js

- Le ban s'exécute dans le middleware Next.js **avant** tout chargement de page
- Vérification Redis en < 1ms : `visitorId` FingerprintJS + fingerprint composite + IP
- Si banni → redirection silencieuse vers `/not-found` (le fraudeur croit que le site est cassé)
- Le cookie `_velora_vid` (`visitorId`) est persisté 1 an pour identification au retour
- Ban permanent ou temporaire (30j, 90j) configurable depuis le dashboard

---

## 7. Système anti-fraude — Contre-attaques actives

En plus de bloquer, le système contre-attaque activement pour collecter des informations sur le fraudeur, épuiser ses ressources, et l'exclure définitivement de l'écosystème publicitaire. Toutes les contre-attaques décrites sont légales et s'exercent exclusivement sur les systèmes Velora.

### Contre-attaque 1 — Honeypot (leurre de commande)

- Le fraudeur à score élevé reçoit une fausse confirmation de commande réussie
- Il croit avoir commandé — aucune commande réelle créée, aucun stock réservé
- Le système collecte en arrière-plan : IP, VPN provider, device fingerprint, comportement
- Session recording rrweb activé : chaque clic, scroll et frappe enregistrés
- Après 30 minutes simulées, une erreur technique s'affiche
- Toutes les données collectées disponibles dans le dashboard sous "Sessions suspectes"

### Contre-attaque 2 — Tarpit (ralentissement progressif)

- Les requêtes des suspects sont ralenties artificiellement côté serveur
- Score 50–60 → 2 secondes de délai par requête
- Score 60–75 → 8 secondes de délai
- Score 75–90 → 15 secondes de délai
- Score > 90 → 30 secondes de délai
- Le fraudeur ne sait pas qu'il est ralenti — le site semble juste lent

### Contre-attaque 3 — Pixel de tracking retour

- Pixel image 1×1 transparent inclus dans la page de confirmation honeypot
- Chaque chargement loggé : IP, user-agent, referer, timestamp
- Si l'IP change entre commande et ouverture de confirmation → complicité détectée
- Si le lien est partagé, toutes les IPs qui l'ouvrent sont collectées

### Contre-attaque 4 — Exclusion audiences publicitaires

- **Meta** : Custom Audience "Fraudeurs" — téléphone et `external_id` hachés SHA256 ajoutés
- Cette audience est en exclusion sur toutes les campagnes Meta automatiquement
- **TikTok** : même logique via TikTok Custom Audience API
- **Snapchat** : Snap Audience Match (SAM) — téléphone haché SHA256 ajouté au segment
- Événement CAPI custom `FraudDetected` envoyé pour informer les algorithmes pub
- Le fraudeur ne verra plus aucune publicité Velora sur aucune plateforme

### Contre-attaque 5 — Signalement opérateurs télécom

- Rapport structuré envoyé à Orange Bénin, MTN Bénin, Moov Africa selon opérateur détecté
- Contenu : numéro, dates, IPs, preuve VPN, order IDs, perte estimée FCFA
- Les opérateurs peuvent enquêter et suspendre la SIM du fraudeur
- Chaque signalement loggé en base avec statut de suivi

### Contre-attaque 6 — Réseau inter-marchands COD Afrique

- Partage de données fraudeurs avec d'autres e-commerçants COD africains partenaires
- Toutes les données partagées sont hachées SHA256 — jamais de données en clair
- Un fraudeur banni chez Velora est automatiquement partagé au réseau
- Consultation du réseau avant chaque commande : signalé ailleurs = +40 points au score

### Tableau de résistance complet

| Attaque | Patch | Résistance | Mécanisme |
|---|---|---|---|
| Changer de VPN / IP | IPQualityScore + ban IP | ✅ Fort | Fingerprint hardware identique |
| Navigation privée | FingerprintJS Pro | ✅ Fort | Fingerprint basé hardware |
| Vider les cookies | Fingerprint recalculé | ✅ Fort | GPU + audio = même résultat |
| Autre navigateur même PC | Fingerprint composite maison | ✅ Fort | GPU + timezone + audio cross-browser |
| Navigateur antidetect | Détection tampering multi-couches | ✅ Fort | Canvas noise + WebGL incohérence |
| Tor / réseau anonyme | Blocage immédiat flag Tor | ✅ Total | IPQualityScore `isTor` = block direct |
| Numéro virtuel / VoIP | HLR Lookup `isVoip` | ✅ Fort | Africa's Talking HLR détection |
| Faux numéro inactif | HLR status absent + OTP SMS | ✅ Fort | OTP = preuve numéro physiquement actif |
| Autre appareil physique | Fuzzy match nom + adresse + pattern | ⚠️ Moyen | Levenshtein similarity > 82% |
| Nouvelle SIM même personne | Behavioral + pattern matching | ⚠️ Moyen | Zone + heure + montant + opérateur |
| Complice différent | Confirmation téléphonique humaine | ⚠️ Humain | Équipe formée, aucun patch technique |

---

## 8. Dashboard admin COD

Le dashboard est l'outil quotidien de l'équipe Velora. Il centralise la gestion des commandes, le tracking, la fraude et les analytics pour tous les marchés depuis une interface unique sécurisée.

### Modules principaux

| Module | Description |
|---|---|
| **File de commandes** | Toutes les commandes par marché, triées par priorité, filtres statut/score/marché |
| **Fiche commande** | Score de risque visuel, signaux fraude, panier snapshot, historique appels agent |
| **Actions 1 clic** | Accepter · Vérification manuelle · BAN complet · Basculer en Honeypot |
| **Ban manager** | Exécute ban device + IP + téléphone + exclusion toutes audiences pub simultanément |
| **Blacklist manager** | Consulter, ajouter, modifier, expirer les entrées (téléphone, IP, device, nom, adresse) |
| **Config marchés** | Tous les toggles tracking (`submission_event`, `send_purchase_on_delivery`) et anti-fraude |
| **Analytics COD** | Taux de confirmation, taux de livraison, taux de retour, CA et fraude par marché |
| **Event log tracking** | Tous les événements CAPI envoyés à Meta et TikTok avec statut et payload complet |
| **Session viewer** | Replay des sessions honeypot enregistrées via rrweb |
| **Signalements télécom** | Historique des rapports envoyés aux opérateurs, statuts de suivi |

### Interface fiche commande

En un coup d'œil sur chaque commande :

- Score de risque affiché visuellement (vert/orange/rouge) avec détail des signaux déclencheurs
- Indicateurs : VPN détecté, numéro VoIP, doublons récents, match blacklist, navigateur suspect
- Panier complet avec variantes, quantités, offres appliquées, total en devise locale
- Infos client avec fuzzy match automatique si ressemblance avec une entrée blacklist
- Bouton BAN → modal de confirmation listant toutes les actions incluses avant exécution

---

## 9. Plan de développement — 9 phases

Le développement est organisé en 9 phases progressives. Chaque phase livre de la valeur immédiatement et pose les bases de la suivante. Les phases 0 à 3 tournent en parallèle de Shopify sans aucune interruption de ventes.

### Vue d'ensemble

| Phase | Durée | Priorité | Livrables clés |
|---|---|---|---|
| **Phase 0** — Fondations | 2 semaines | 🔴 Critique | Repo monorepo, CI/CD GitHub Actions, domaines SSL, Supabase, Redis, variables secrètes |
| **Phase 1** — Dashboard COD v1 | 4 semaines | 🔴 Critique | Dashboard connecté API Shopify, file commandes, fiche commande, score fraude basique, auth 2FA |
| **Phase 2** — Anti-fraude v1 | 3 semaines | 🔴 Critique | FingerprintJS, IPQualityScore, HLR Lookup, blacklist multi-signaux, ban 1 clic, middleware ban |
| **Phase 3** — Tracking complet | 3 semaines | 🟠 Haute | Tous événements Meta + TikTok, CAPI déduplication, event queue retry, toggles par marché |
| **Phase 4** — Storefront Bénin | 6 semaines | 🟠 Haute | Site custom `/bj`, catalogue, panier multi-produits, variantes, offres, formulaire COD, SEO |
| **Phase 5** — Contre-attaques | 3 semaines | 🟠 Haute | Honeypot, tarpit, session recording rrweb, pixel retour, ban audiences Meta/TikTok/Snapchat |
| **Phase 6** — Anti-fraude v2 | 2 semaines | 🟡 Moyenne | Behavioral matching, fuzzy match adresse/nom, réseau inter-marchands, signalement opérateurs |
| **Phase 7** — Multi-marchés CI/GA | 4 semaines | 🟡 Moyenne | Storefronts `/ci` et `/ga`, configs marchés, livreurs locaux, page sélection pays |
| **Phase 8** — Migration Shopify | 2 semaines | 🟢 Basse | Redirection domaine, import catalogue complet, coupure Shopify, tests de régression |

> **Total : 29 semaines (~7 mois)** pour un développeur senior seul, ou ~4 mois avec une équipe de 2
> Les phases 0 à 3 (11 semaines) sont le MVP prioritaire — elles apportent 80% de la valeur

### Détail Phase 0 — Fondations (Semaines 1–2)

- **Monorepo** : `apps/storefront` (Next.js), `apps/admin` (Next.js), `apps/api` (Express 5 + TypeScript), `packages/tracking`, `packages/fraud`
- **Squelette API** : Express 5, routers par domaine, `helmet`, `zod`, `express-rate-limit` sur store Redis, handler d'erreurs centralisé, `/health`
- **CI/CD** : GitHub Actions, déploiement automatique sur Vercel (front) et Railway (API Docker)
- **Domaines** : `velora.com`, `admin.velora.com`, `api.velora.com` avec certificats SSL Let's Encrypt
- **Supabase** : projet créé, schéma initial, Row Level Security, seed données de test
- **Upstash Redis** : instance créée, connexion testée, variables d'environnement injectées
- **Secrets** : tous les tokens Meta, TikTok, Snapchat, FingerprintJS Pro, IPQualityScore, Africa's Talking

### Détail Phase 1 — Dashboard COD v1 (Semaines 3–6)

- Connexion API Shopify : lecture commandes, mise à jour statuts, webhooks temps réel
- UI file de commandes : liste paginée, filtres marché/statut/score, tri priorité
- Fiche commande : panier snapshot, infos client, score risque visuel, historique
- Confirmation agent : appel loggé, statut commande mis à jour, SMS de suivi client
- Blacklist basique : ajout manuel téléphone et IP depuis l'interface
- Auth admin : email + mot de passe + 2FA obligatoire, sessions sécurisées

### Détail Phase 2 — Anti-fraude v1 (Semaines 7–9)

- Intégration FingerprintJS Pro : cookie `_velora_vid`, vérification Redis dans middleware Next.js
- Intégration IPQualityScore : vérification IP à chaque soumission de commande
- HLR Lookup Africa's Talking : validation téléphone format + actif + non-VoIP
- Moteur de score de risque : agrégation tous signaux, seuils accept/review/block
- Blacklist multi-signaux : téléphone, IP, device, plages CIDR
- Ban 1 clic dans dashboard : Redis + PostgreSQL + audiences pub simultanément

### Détail Phase 3 — Tracking complet (Semaines 10–12)

- Service unifié `track()` : une seule fonction pour Meta + TikTok, déduplication automatique
- 12 événements couverts : `PageView` → `FraudDetected` — funnel complet documenté
- Event queue pg-boss : retry automatique si CAPI échoue, ordre garanti, idempotency
- Event log PostgreSQL : chaque envoi tracé avec payload, statut, horodatage
- Dashboard tracking : vue temps réel des événements et leurs statuts par marché
- Toggles marchés : `submission_event` et `send_purchase_on_delivery` configurables live

### Détail Phase 4 — Storefront Bénin (Semaines 13–18)

- Page d'entrée `velora.com` : sélection de marché, détection IP, redirection automatique
- Storefront `/bj` : homepage complète avec toutes les sections (hero, catégories, bestsellers, FAQ)
- Catalogue produits : listing, filtres, tri, recherche
- Pages produit : galerie, sélecteur de variantes, offres, formulaire COD complet
- Panier multi-produits : ajout, modification, suppression, offres appliquées en temps réel
- Formulaire COD : nom, téléphone, adresse, validation, honeypot si suspect
- SEO : métadonnées, sitemap, schémas JSON-LD, Core Web Vitals

### Détail Phase 5 — Contre-attaques (Semaines 19–21)

- Honeypot : fausse confirmation, collection silencieuse, timer 30 minutes
- Tarpit : middleware de délai progressif selon score de risque
- Session recording rrweb : activé automatiquement pour les sessions à score > 40
- Pixel de tracking retour : intégré dans les pages honeypot
- Ban audiences publicitaires : Meta Custom Audience, TikTok Audience, Snap SAM
- CAPI `FraudDetected` : event personnalisé envoyé à chaque ban confirmé

---

## 10. Budget & ressources estimés

Estimations des coûts en régime de croisière post-lancement.

### Infrastructure mensuelle

| Service | Coût / mois | Notes |
|---|---|---|
| Vercel Pro (2 apps) | 20 $ | Storefront + Dashboard admin, Edge Network mondial |
| Railway (API backend) | 10–20 $ | Selon volume de trafic, scaling automatique |
| Supabase Pro | 25 $ | Base de données + auth + Row Level Security |
| Upstash Redis | 0–10 $ | Pay-per-use, très faible pour les ban checks |
| Cloudflare R2 | 0–5 $ | Storage médias, premier TB gratuit, CDN inclus |
| FingerprintJS Pro | 0 $ | Plan gratuit jusqu'à 20 000 visiteurs / mois |
| IPQualityScore | 0–15 $ | Pay-per-use ~0.001$ par vérification IP |
| Africa's Talking HLR | ~0.004$ / lookup | Facturation à l'usage, seulement sur soumissions |
| Africa's Talking SMS OTP | ~0.02$ / SMS | Seulement sur commandes suspectes (5–10% des cas) |
| Sentry + PostHog | 0 $ | Plans gratuits suffisants pour démarrer |
| **Total estimé** | **~80–100 $ / mois** | À comparer avec Shopify Advanced à 299$/mois + apps + commissions |

### Développement

| Profil | Coût estimé |
|---|---|
| Freelance senior (Europe/US) | 2 500 – 4 000 $ / mois |
| Freelance Afrique (CI, SN, CM) | 800 – 1 500 $ / mois |
| Agence e-commerce spécialisée | 10 000 – 25 000 $ projet complet |
| DIY avec assistance Claude | Coût zéro développeur — 6–12 mois selon disponibilité |

### Recommandation

- **Court terme** : garder Shopify (~150$/mois) et construire phases 0–3 en priorité pour 2 000–3 000$
- **Moyen terme** : phases 4–5 (storefront + contre-attaques) — 3 000–5 000$ supplémentaires
- **Long terme** : phases 6–8 selon croissance, finançables par le CA généré
- **ROI attendu** : récupération en 2–3 mois via réduction fraude + amélioration ROAS campagnes pub

---

*© 2025 Velora Commerce · Document confidentiel · Juillet 2025*
