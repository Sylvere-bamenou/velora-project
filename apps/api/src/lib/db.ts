import pg from 'pg';
import { env } from './env.js';

/**
 * Pool de connexions PostgreSQL.
 *
 * Une seule instance partagée pour tout le process : le pool gère les
 * connexions, on ne les ouvre pas à la main par requête.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // Marge raisonnable pour un service unique ; à ajuster si on scale l'API.
  max: 10,
  idleTimeoutMillis: 30_000,
});

/**
 * Le franc CFA n'a pas de sous-unité : les montants sont stockés en entier.
 * node-postgres renvoie les `integer` en number, mais les agrégats (sum, min)
 * reviennent parfois en string selon le type — on force le parse côté lecture
 * quand c'est nécessaire, pas ici.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query(text, params as never);
  return res.rows as T[];
}

/** Renvoie la première ligne, ou undefined. Pour les lectures par identifiant. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/** Ping simple pour la sonde de santé. */
export async function pingDb(): Promise<boolean> {
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  }
}
