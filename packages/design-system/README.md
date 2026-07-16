# @velora/design-system

Traduction en code du guide d'identité Velora.

**Source de vérité** : le projet Claude Design [Identité visuelle Velora](https://claude.ai/design/p/5e32bbf8-5805-422f-98e4-f8ab5b61d6ed), fichier `Identité Velora.dc.html` — copie de référence dans [`design/`](../../design/).

## Contenu

| Fichier | Rôle |
|---|---|
| `tokens.css` | `:root` + `[data-theme="onyx"]`. **Extrait automatiquement du guide, ne pas éditer à la main.** |
| `base.css` | Reset, typographie de base, focus visible, `prefers-reduced-motion`. |
| `src/index.ts` | Formatage des montants FCFA et micro-copie COD. |

## Usage

```ts
import '@velora/design-system/tokens.css';
import '@velora/design-system/base.css';
import { priceForMarket, COD_COPY } from '@velora/design-system';

priceForMarket(25000, 'bj'); // « 25 000 FCFA » (espace fine insécable)
```

## Les trois règles à ne pas contourner

**Les prix.** Le franc CFA n'a pas de sous-unité : les montants sont entiers, séparés par une espace fine insécable (U+202F), jamais par une virgule ni une espace ordinaire — une espace ordinaire autorise un retour à la ligne au milieu d'un prix. Les chiffres sont tabulaires (`font-feature-settings: 'tnum'`, déjà posé dans `base.css`) : sans ça, les prix « dansent » d'une carte produit à l'autre. Passez toujours par `formatAmount` / `formatPrice`.

**La micro-copie.** Le client ne paie rien en ligne. Tout verbe de paiement au présent (« Acheter maintenant », « Paiement réussi », « Paiement sécurisé ») décrit une chose qui n'a pas lieu. Les formulations validées sont dans `COD_COPY` — utilisez-les plutôt que d'en réécrire.

**Le thème sombre.** `[data-theme="onyx"]` ne réassigne **que** des couleurs. Aucun espacement, rayon ou ombre ne change entre les thèmes. Si vous avez besoin d'un jeton structurel conditionné au thème, c'est le signe d'un problème ailleurs.

## Contraste

Les ratios WCAG sont annotés dans `tokens.css`. Deux points de vigilance :

- `--ink-3` (#867E6D) est à 3.6:1 sur `--ivory` — **réservé au grand texte, aux placeholders et au texte muté**. Ne l'utilisez pas pour du corps de texte.
- `--gold` (#B7923F) est un ton décoratif (filets, monogramme, état actif). Pour du texte ou un lien sur fond clair, utilisez `--gold-strong` (4.8:1, AA).

## Régénérer les jetons

`tokens.css` est extrait du guide d'identité. Après modification du guide dans Claude Design :

```bash
pnpm --filter @velora/design-system sync-tokens
```
