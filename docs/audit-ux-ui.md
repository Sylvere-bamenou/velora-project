# Audit UX/UI 360 — Storefront Velora

> Réalisé sur le storefront en fonctionnement (données réelles : les 9 produits importés de Shopify), en mobile (375px) et desktop, parcours complet home / catalogue / fiche produit / tunnel COD / confirmation, plus inspection accessibilité et console.

## Ce qui est solide

Le tunnel COD est le point fort et il tient : produit → coordonnées → confirmation est fluide, la micro-copie est juste (« On vous appelle pour confirmer », « À payer en espèces », jamais « Payer maintenant »), la confirmation personnalisée rassure sans mentir. La validation de formulaire est claire (bordures rouges, messages, ville pré-remplie). Prix FCFA impeccables (chiffres tabulaires, espace fine, prix barré + économie). Cibles tactiles correctes (CTA 52px, champs 46px). Console propre. Design system cohérent partout.

## P0 — critique (le contenu contredit le positionnement premium)

1. **Imagerie d'autres marques.** Les photos importées portent des logos tiers : boîte montre « TOMI / face gear », sacoche « arctic hunter », ceinture sur fond de bois marketplace, boxers avec montage « PACKSTAGES CHECKLIST ». Visuels dropshipping, interdits par le brief. Aucune DA ne compense une photo qui affiche le logo d'un concurrent.
2. **Noms dropshipping.** « H-Flex Belt™ – La ceinture sans boucle, confortable et ajustable », « TOMI Dynasty ™ T106 – La montre qui attire les regards ». Longs, pleins de ™, ton argumentaire, tronqués en plein mot sur mobile. Il faut des noms courts et sobres, l'argumentaire va dans la description.
3. **Fausses promotions généralisées.** Les 9 produits ont tous prix barré + badge (−14 à −38 %). Tout est rouge, tout « solde » : le ressort dropshipping que le brief bannit.
4. **Cohérence catalogue.** Un kit d'ongles Polygel (Born Pretty) et des lots de boxers dans une marque « mode masculine premium ». Doublon H-Flex (deux fiches, 11 000 et 12 500).

## P1 — important

5. **Fiche produit non responsive desktop.** Le tunnel est une colonne de 430px centrée dans un écran de 1280 : une capture de téléphone flottant dans du beige. Le catalogue, lui, est responsive. Manque une vraie mise en page desktop (galerie / détails).
6. **Vignettes de galerie leurres.** Bordure, état actif doré, l'air cliquable, mais inertes (`span`, absentes de l'arbre d'accessibilité). Les rendre fonctionnelles ou retirer l'apparence interactive.
7. **Châssis storefront manquant.** Pas d'en-tête de navigation, pas de panier, pas de recherche, pas de pied de page (contact, WhatsApp, mentions). Panier mono-produit alors que le schéma prévoit le multi-produits. Pas de retour accueil / changement de pays depuis le catalogue.
8. **Descriptions dégradées.** Les puces du HTML Shopify sont aplaties en losanges « ◈ » au fil du texte. L'import doit préserver les listes.
9. **`<title>` d'onglet = nom complet** (phrase marketing entière). À tronquer, mauvais pour le SEO.

## P2 — accessibilité et finitions

10. **Erreurs de formulaire non annoncées** : `aria-invalid` posé, mais pas d'`aria-describedby` reliant champ et message, ni région `aria-live`/`role="alert"`.
11. **Pas de `h1`** sur les étapes formulaire et confirmation ; l'accueil met « VELORA » dans une `div`.
12. **Options couleur en texte** plutôt qu'en pastilles, alors que le design system les prévoyait.
13. **État « rupture » jamais testé** faute de donnée en rupture dans le catalogue actuel.

## Priorisation

Le storefront est mécaniquement bon et esthétiquement propre. Son problème central n'est pas le code, c'est le contenu importé (photos d'autres marques, noms dropshipping, fausses remises) qui contredit le positionnement premium. Ordre recommandé : P0 contenu, puis mise en page desktop de la fiche (P1-5) et châssis manquant (P1-7), puis accessibilité (P2).
