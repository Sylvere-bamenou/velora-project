#!/usr/bin/env node
/**
 * Ré-extrait tokens.css depuis le guide d'identité Claude Design.
 *
 * Le guide (design/Identité Velora.dc.html) est la source de vérité : il porte
 * le bloc `tokenCss` avec les ratios de contraste annotés. Recopier les valeurs
 * à la main, c'est garantir qu'elles divergeront.
 *
 * Usage : pnpm --filter @velora/design-system sync-tokens
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const GUIDE = resolve(here, '../../../design/Identité Velora.dc.html');
const OUT = resolve(here, '../tokens.css');

const HEADER = `/* ============================================================
 * Velora · Jetons de design
 * Source de vérité : Claude Design → « Identité Velora.dc.html » (§11)
 * Extrait automatiquement — ne pas éditer à la main.
 * Toute évolution part du fichier d'identité, puis est ré-extraite.
 * ============================================================ */

`;

let guide;
try {
  guide = readFileSync(GUIDE, 'utf8');
} catch {
  console.error(`✗ Guide introuvable : ${GUIDE}`);
  console.error("  Ré-importez-le depuis Claude Design avant de synchroniser.");
  process.exit(1);
}

const match = guide.match(/const tokenCss = `(.*?)`;/s);
if (!match) {
  console.error("✗ Bloc `tokenCss` introuvable dans le guide.");
  console.error("  La structure du guide a changé — vérifiez la §11 avant d'ajuster ce script.");
  process.exit(1);
}

const tokens = match[1];

// Garde-fou : le guide doit porter les deux thèmes. Une extraction partielle
// passerait inaperçue et casserait le mode sombre en silence.
for (const required of [':root', '[data-theme="onyx"]']) {
  if (!tokens.includes(required)) {
    console.error(`✗ Extraction suspecte : « ${required} » absent du bloc extrait.`);
    process.exit(1);
  }
}

const next = HEADER + tokens + '\n';
const prev = (() => {
  try {
    return readFileSync(OUT, 'utf8');
  } catch {
    return null;
  }
})();

if (prev === next) {
  console.log('✓ tokens.css déjà à jour.');
  process.exit(0);
}

writeFileSync(OUT, next, 'utf8');
const varCount = (tokens.match(/^\s*--/gm) ?? []).length;
console.log(`✓ tokens.css régénéré — ${varCount} déclarations, ${tokens.split('\n').length} lignes.`);
if (prev !== null) console.log('  Relisez le diff : un jeton renommé casse les apps qui le consomment.');
