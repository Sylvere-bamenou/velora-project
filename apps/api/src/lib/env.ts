import { z } from 'zod';

/**
 * Validation de la configuration au démarrage.
 *
 * Un secret manquant doit tuer le process immédiatement, pas produire un
 * `undefined` qui atteint silencieusement l'API Meta trois heures plus tard.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  /** Origines autorisées pour CORS, séparées par des virgules. */
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // ─── Supabase ───
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Shopify n'a AUCUNE variable ici : l'API runtime est indépendante de
  // Shopify. La migration one-shot (catalogue + historique commandes) vit
  // dans scripts/ et lit ses identifiants directement dans l'environnement.
  // Voir scripts/migrate-shopify-orders.mjs.

  // ─── Upstash Redis (bans, rate limiting) ───
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ─── Tracking · globaux, partagés par tous les marchés ───
  META_PIXEL_ID: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  TIKTOK_PIXEL_ID: z.string().optional(),
  TIKTOK_ACCESS_TOKEN: z.string().optional(),
  SNAPCHAT_PIXEL_ID: z.string().optional(),
  SNAPCHAT_ACCESS_TOKEN: z.string().optional(),

  // ─── Anti-fraude ───
  FINGERPRINTJS_API_KEY: z.string().optional(),
  IPQUALITYSCORE_API_KEY: z.string().optional(),
  AFRICAS_TALKING_USERNAME: z.string().optional(),
  AFRICAS_TALKING_API_KEY: z.string().optional(),

  /**
   * Garde-fou global. `shadow` : le moteur score et journalise sans bloquer.
   * Voir packages/fraud — ne passez pas à `active` sans données réelles.
   */
  FRAUD_ENFORCEMENT: z.enum(['shadow', 'active']).default('shadow'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('✗ Configuration invalide :');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
