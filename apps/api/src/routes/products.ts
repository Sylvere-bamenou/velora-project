import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { HttpError } from '../middleware/error.js';

export const productsRouter: Router = Router();

interface ProductRow {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  images: string[];
}

interface VariantRow {
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  price_before: number | null;
  stock: number;
  images: string[];
}

/** Liste du catalogue actif, avec le prix d'entrée de chaque produit. */
productsRouter.get('/products', async (_req, res) => {
  const rows = await query<{
    slug: string;
    name: string;
    category: string | null;
    price_min: number;
    in_stock: boolean;
    image: string | null;
  }>(
    // Image de carte : celle de la variante la moins chère si elle existe,
    // sinon la première image de la galerie produit.
    `select p.slug, p.name, p.category,
            min(v.price)::int as price_min,
            bool_or(v.stock > 0) as in_stock,
            coalesce(
              (array_agg(v.images->>0 order by v.price) filter (where v.images->>0 is not null))[1],
              p.images->>0
            ) as image
     from products p
     join variants v on v.product_id = p.id
     where p.active = true
     group by p.slug, p.name, p.category, p.images
     order by p.name`,
  );
  res.json({ products: rows });
});

/** Détail d'un produit avec toutes ses variantes. */
productsRouter.get('/products/:slug', async (req, res) => {
  const product = await queryOne<ProductRow>(
    `select slug, name, category, description, images from products where slug = $1 and active = true`,
    [req.params.slug],
  );
  if (!product) throw new HttpError(404, `Produit inconnu : ${req.params.slug}`, 'unknown_product');

  const variants = await query<VariantRow>(
    `select v.sku, v.color, v.size, v.price::int, v.price_before::int, v.stock, v.images
     from variants v
     join products p on p.id = v.product_id
     where p.slug = $1
     order by v.price`,
    [req.params.slug],
  );

  res.json({ product: { ...product, variants } });
});
