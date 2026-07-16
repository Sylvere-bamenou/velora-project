# design/ — source de vérité de la marque

Copies de référence du projet Claude Design [**Identité visuelle Velora**](https://claude.ai/design/p/5e32bbf8-5805-422f-98e4-f8ab5b61d6ed) (`5e32bbf8-5805-422f-98e4-f8ab5b61d6ed`).

| Fichier | Rôle |
|---|---|
| `Identité Velora.dc.html` | Guide d'identité, 11 sections. **Source des jetons** — `packages/design-system/tokens.css` en est extrait automatiquement. |
| `Storefront Velora.dc.html` | Prototype du tunnel COD : produit → commande → confirmation. Référence de comportement pour `apps/storefront`. |

Ces fichiers sont au format Claude Design (`<x-dc>`, `<sc-if>`, `<sc-for>`, `DCLogic`). Ils ne s'exécutent pas hors de Claude Design — ils sont ici comme référence versionnée, pas comme code.

## Sens de circulation

```
Claude Design  ──import──▶  design/*.dc.html  ──sync-tokens──▶  packages/design-system/tokens.css
   (édition)                  (référence)                            (consommé par les apps)
```

L'identité s'édite **dans Claude Design**, jamais ici. Après modification :

1. Ré-importer le fichier dans `design/`.
2. `pnpm --filter @velora/design-system sync-tokens`
3. Relire le diff de `tokens.css` — un jeton renommé casse les apps qui le consomment.

Le CI vérifie que `tokens.css` est bien le produit de l'extraction : une édition manuelle du fichier généré fait échouer le build.

## Assets

Les 7 PNG du prototype n'ont **pas** été importés : la lecture de fichiers Claude Design plafonne à 256 KiB et chacun dépasse cette limite (transfert tronqué, image illisible). Le storefront tourne sur des placeholders — voir [`apps/storefront/public/assets/README.md`](../apps/storefront/public/assets/README.md) pour la procédure de récupération manuelle.
