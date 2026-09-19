#!/usr/bin/env node
/**
 * Importe le catalogue public d'une boutique Shopify dans Velora.
 *
 * Source : endpoint public /products.json (aucun identifiant requis).
 * Ne récupère QUE le catalogue : produits, variantes, prix, images.
 * Les commandes, clients et statuts de livraison ne sont pas exposés
 * publiquement et exigent un token Admin API (voir apps/api/src/lib/shopify.ts).
 *
 * Sorties :
 *   apps/storefront/lib/catalog.generated.json   consommé par le storefront
 *   supabase/seed-catalog.sql                     pour quand Supabase est branché
 *
 * Usage :
 *   node scripts/import-shopify-catalog.mjs [domaine.myshopify.com]
 *   SHOPIFY_STORE_DOMAIN=... node scripts/import-shopify-catalog.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

/** Dossier d'hébergement local des images rapatriées. */
const IMG_DIR = resolve(ROOT, 'apps/storefront/public/assets/shopify');
/** Chemin public servi par le storefront. */
const IMG_PUBLIC = '/assets/shopify';

/**
 * Télécharge une image et renvoie son chemin local public.
 * Nom stable et unique : basename + hash court de l'URL, pour couper
 * définitivement la dépendance au CDN Shopify.
 */
async function downloadImage(url, cache) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);

  const clean = url.split('?')[0];
  const ext = extname(clean) || '.jpg';
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
  const name = `${hash}${ext}`;
  const dest = resolve(IMG_DIR, name);
  const publicPath = `${IMG_PUBLIC}/${name}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  ⚠ image ${res.status} : ${clean.slice(-40)}`);
    cache.set(url, null);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  cache.set(url, publicPath);
  return publicPath;
}

const DOMAIN =
  process.argv[2] || process.env.SHOPIFY_STORE_DOMAIN || 'jngiej-ax.myshopify.com';

/** Prix Shopify en chaîne. Le FCFA n'a pas de sous-unité : on arrondit à l'entier. */
function toAmount(str) {
  const n = Math.round(parseFloat(str ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/** Retire le HTML d'une description pour un stockage texte sûr. */
function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sqlStr(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  console.log(`→ Aspiration du catalogue : ${DOMAIN}`);
  const res = await fetch(`https://${DOMAIN}/products.json?limit=250`);
  if (!res.ok) {
    console.error(`✗ ${DOMAIN}/products.json a répondu ${res.status}`);
    process.exit(1);
  }
  const { products } = await res.json();
  console.log(`  ${products.length} entrées récupérées`);

  const catalog = products.map((p) => {
    const options = (p.options ?? []).map((o) => ({ name: o.name, values: o.values }));
    // Une seule option nommée « Title » = produit sans réelle variante.
    const hasRealOptions = !(options.length === 1 && options[0].name === 'Title');

    const variants = (p.variants ?? []).map((v) => ({
      id: String(v.id),
      sku: v.sku || null,
      optionValues: [v.option1, v.option2, v.option3].filter((x) => x != null),
      price: toAmount(v.price),
      priceBefore: v.compare_at_price ? toAmount(v.compare_at_price) : null,
      available: Boolean(v.available),
      image: v.featured_image?.src ?? null,
    }));

    const prices = variants.map((v) => v.price);
    const images = (p.images ?? []).map((img) => ({ src: img.src, alt: img.alt ?? null }));

    return {
      slug: p.handle,
      title: p.title,
      vendor: p.vendor ?? null,
      productType: p.product_type || null,
      description: stripHtml(p.body_html),
      options: hasRealOptions ? options : [],
      variants,
      images,
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      // Origine tracée : on saura toujours d'où vient chaque ligne.
      source: { platform: 'shopify', domain: DOMAIN, productId: String(p.id) },
    };
  });

  // Détection des doublons de handle (aucun attendu, mais le catalogue réel
  // contient deux H-Flex à handles distincts — on les garde, on les signale).
  const seen = new Map();
  for (const p of catalog) seen.set(p.slug, (seen.get(p.slug) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1);
  if (dupes.length) {
    console.log(`  ⚠ handles en double : ${dupes.map(([h]) => h).join(', ')}`);
  }
  const titleDupes = new Map();
  for (const p of catalog) {
    const key = p.title.trim();
    titleDupes.set(key, (titleDupes.get(key) ?? 0) + 1);
  }
  for (const [t, n] of titleDupes) {
    if (n > 1) console.log(`  ⚠ titre en double (${n}×) : ${t.slice(0, 50)}`);
  }

  // ─── Rapatriement des images : on coupe la dépendance au CDN Shopify ───
  mkdirSync(IMG_DIR, { recursive: true });
  const imgCache = new Map();
  let downloaded = 0;
  for (const p of catalog) {
    for (const v of p.variants) {
      const local = await downloadImage(v.image, imgCache);
      if (local && v.image) downloaded++;
      v.image = local;
    }
    p.images = (
      await Promise.all(
        p.images.map(async (img) => {
          const local = await downloadImage(img.src, imgCache);
          if (local) downloaded++;
          return local ? { src: local, alt: img.alt } : null;
        }),
      )
    ).filter((x) => x != null);
  }
  console.log(`  ${downloaded} images rapatriées dans public/assets/shopify (${imgCache.size} uniques)`);

  // ─── Sortie 1 : JSON pour le storefront ───
  const jsonPath = resolve(ROOT, 'apps/storefront/lib/catalog.generated.json');
  const jsonPayload = {
    _generated: 'Ne pas éditer à la main. Régénéré par scripts/import-shopify-catalog.mjs',
    _source: { domain: DOMAIN, importedAt: new Date().toISOString(), count: catalog.length },
    products: catalog,
  };
  writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2) + '\n');
  console.log(`✓ ${jsonPath}`);

  // ─── Sortie 2 : seed SQL pour Supabase ───
  const lines = [
    '-- ============================================================',
    '-- Velora · catalogue importé de Shopify',
    `-- Source : ${DOMAIN} · ${new Date().toISOString()}`,
    '-- Généré par scripts/import-shopify-catalog.mjs — ne pas éditer à la main.',
    '-- Idempotent : on upsert par slug / sku.',
    '-- ============================================================',
    '',
  ];
  for (const p of catalog) {
    lines.push(
      `insert into products (slug, name, category, description, active) values (` +
        `${sqlStr(p.slug)}, ${sqlStr(p.title)}, ${sqlStr(p.productType)}, ${sqlStr(p.description)}, true)` +
        ` on conflict (slug) do update set name = excluded.name, category = excluded.category, description = excluded.description;`,
    );
    for (const v of p.variants) {
      const sku = v.sku || `${p.slug}-${v.id}`;
      lines.push(
        `insert into variants (product_id, sku, color, size, price, price_before, stock, images) select id, ` +
          `${sqlStr(sku)}, ${sqlStr(v.optionValues[0] ?? null)}, ${sqlStr(v.optionValues[1] ?? null)}, ` +
          `${v.price}, ${v.priceBefore ?? 'null'}, ${v.available ? 10 : 0}, ` +
          `${sqlStr(JSON.stringify(v.image ? [v.image] : []))}::jsonb ` +
          `from products where slug = ${sqlStr(p.slug)} ` +
          `on conflict (sku) do update set price = excluded.price, price_before = excluded.price_before;`,
      );
    }
    lines.push('');
  }
  const sqlPath = resolve(ROOT, 'supabase/seed-catalog.sql');
  writeFileSync(sqlPath, lines.join('\n'));
  console.log(`✓ ${sqlPath}`);

  const variantCount = catalog.reduce((n, p) => n + p.variants.length, 0);
  console.log(`\n${catalog.length} produits · ${variantCount} variantes importés.`);
}

main().catch((err) => {
  console.error('✗ Import échoué :', err.message);
  process.exit(1);
});
