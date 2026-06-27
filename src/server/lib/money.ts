// Pure money helpers for Stellar asset-unit decimal strings (7 dp max).
// No DB/server imports — safe to use in client components.

/** Convert a decimal asset amount ("12.5") to integer stroops (BigInt). */
export function toStroops(amount: string): bigint {
  const [whole, frac = ''] = amount.trim().split('.');
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  const sign = whole.startsWith('-') ? -1n : 1n;
  const wholeAbs = whole.replace('-', '') || '0';
  return sign * (BigInt(wholeAbs) * 10_000_000n + BigInt(fracPadded || '0'));
}

/** Convert integer stroops back to a trimmed decimal string. */
export function fromStroops(stroops: bigint): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = abs / 10_000_000n;
  const frac = (abs % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '');
  const out = frac ? `${whole}.${frac}` : whole.toString();
  return neg ? `-${out}` : out;
}

/** Add two decimal asset amounts, returning a trimmed decimal string. */
export function addAmounts(a: string, b: string): string {
  return fromStroops(toStroops(a) + toStroops(b));
}

/** Human display with thousands separators, up to 7 dp. */
export function formatAmount(amount: string): string {
  const stroops = toStroops(amount);
  const whole = stroops / 10_000_000n;
  const frac = (stroops % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Progress percentage (0–100) of raised toward goal. */
export function calcProgress(raised: string, goal: string): number {
  const g = toStroops(goal);
  if (g === 0n) return 0;
  const pct = (Number(toStroops(raised)) / Number(g)) * 100;
  return Math.max(0, Math.min(pct, 100));
}

/** True if `amount` is a valid positive decimal with <= 7 dp. */
export function isValidAmount(amount: string): boolean {
  if (!/^\d+(\.\d{1,7})?$/.test(amount.trim())) return false;
  return toStroops(amount) > 0n;
}
