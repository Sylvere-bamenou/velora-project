import type { Market } from '@velora/design-system';

/** Marchés ouverts au public. En Phase 0, seul le Bénin. */
export const ENABLED_MARKETS: Market[] = ['bj'];

export const MARKET_DELIVERY: Record<Market, string> = {
  bj: '24–48 h',
  ci: '48–72 h',
  ga: '3–5 j',
};

export function parseMarket(value: string): Market | null {
  return (ENABLED_MARKETS as string[]).includes(value) ? (value as Market) : null;
}
