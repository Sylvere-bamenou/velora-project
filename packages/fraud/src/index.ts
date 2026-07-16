/**
 * Moteur de score de risque (Phase 2 du plan).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MODE SHADOW PAR DÉFAUT.
 *
 * Le moteur calcule et journalise, mais ne bloque pas tant que
 * `enforcement: 'active'` n'est pas explicitement demandé par marché.
 *
 * Pourquoi : les réseaux mobiles ouest-africains (Orange, MTN, Moov) sont
 * massivement en CGNAT — des milliers d'abonnés partagent une poignée d'IP
 * publiques, et les bases de réputation IP classent souvent ces plages en
 * proxy/datacenter. Activer le blocage sans mesure préalable revient à
 * bannir de vrais clients en série.
 *
 * Un client bloqué à tort ne se plaint pas : il part, et il n'apparaît nulle
 * part dans le dashboard. Le faux positif est invisible et sans limite haute
 * — contrairement à la fraude, qui elle est mesurable.
 *
 * Sortir du shadow mode suppose d'avoir regardé la distribution réelle des
 * scores sur plusieurs semaines de trafic.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Market = 'bj' | 'ci' | 'ga';
export type Decision = 'accept' | 'review' | 'block' | 'blacklist';
export type Enforcement = 'shadow' | 'active';

export interface RiskSignal {
  code: string;
  points: number;
  detail: string;
}

export interface RiskAssessment {
  score: number;
  signals: RiskSignal[];
  /** Ce que le moteur déciderait. */
  decision: Decision;
  /** Ce qui est réellement appliqué — `accept` tant qu'on est en shadow. */
  applied: Decision;
  enforcement: Enforcement;
}

export interface MarketThresholds {
  review: number;
  block: number;
  blacklist: number;
}

export const DEFAULT_THRESHOLDS: MarketThresholds = {
  review: 30,
  block: 70,
  blacklist: 85,
};

function decide(score: number, t: MarketThresholds): Decision {
  if (score >= t.blacklist) return 'blacklist';
  if (score >= t.block) return 'block';
  if (score >= t.review) return 'review';
  return 'accept';
}

/**
 * Agrège les signaux en un score 0–100 et une décision.
 *
 * @param enforcement `shadow` (défaut) journalise sans bloquer.
 */
export function assess(
  signals: RiskSignal[],
  opts: { thresholds?: MarketThresholds; enforcement?: Enforcement } = {},
): RiskAssessment {
  const thresholds = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const enforcement = opts.enforcement ?? 'shadow';

  const score = Math.min(100, Math.max(0, signals.reduce((sum, s) => sum + s.points, 0)));
  const decision = decide(score, thresholds);

  return {
    score,
    signals,
    decision,
    applied: enforcement === 'active' ? decision : 'accept',
    enforcement,
  };
}

/**
 * Barème indicatif (§6 du plan). Les points sont à recalibrer sur données
 * réelles avant toute activation — surtout `ip_vpn` et `ip_out_of_market`,
 * les deux plus exposés aux faux positifs en contexte CGNAT.
 */
export const SIGNAL_WEIGHTS = {
  ip_tor: 100,
  ip_vpn: 55,
  ip_fraud_score_high: 30,
  ip_out_of_market: 20,
  phone_voip: 100,
  phone_operator_mismatch: 25,
  device_tampering: 40,
  network_reported: 40,
} as const;
