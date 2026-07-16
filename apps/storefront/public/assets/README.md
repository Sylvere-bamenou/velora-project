# Assets — placeholders

Les fichiers `.svg` de ce dossier sont des **placeholders**, pas les visuels du prototype.

## Pourquoi

Les vrais visuels (`prod-chrono.png`, `photo-lifestyle.png`, …) vivent dans le projet Claude Design [Identité visuelle Velora](https://claude.ai/design/p/5e32bbf8-5805-422f-98e4-f8ab5b61d6ed). Ils n'ont pas pu être importés automatiquement : la lecture de fichiers plafonne à 256 KiB et chaque PNG dépasse cette limite — le transfert renvoie une image tronquée, sans marqueur de fin, donc illisible.

## Récupérer les vrais visuels

1. Ouvrir le projet Claude Design.
2. Télécharger les 7 fichiers du dossier `assets/` :
   `prod-chrono.png` · `prod-watch-gold.png` · `prod-wallet.png` · `prod-belt.png` · `photo-packshot.png` · `photo-lifestyle.png` · `photo-detail.png`
3. Les déposer ici.
4. Dans [`lib/catalog.ts`](../../lib/catalog.ts), repasser les extensions de `.svg` à `.png`.
5. Supprimer les placeholders.

## Direction photo

Les visuels définitifs doivent suivre la §06 du guide d'identité — shootés localement, fond uni neutre, lumière naturelle. Ni coucher de soleil orange, ni motif « tribal », ni mannequin de banque d'images.
