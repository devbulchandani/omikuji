import { parseUnits, formatUnits } from 'viem';

export const USD_DECIMALS = 6;

/** Parse a human-readable USD string (e.g. "1.50") into the smallest unit (bigint with 6 decimals). */
export function parseUSD(amount: string): bigint {
  return parseUnits(amount, USD_DECIMALS);
}

/** Format a raw USD bigint (6 decimals) into a human-readable string. */
export function formatUSD(amount: bigint): string {
  return formatUnits(amount, USD_DECIMALS);
}
