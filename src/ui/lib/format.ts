/** Shorten a Stellar address or tx hash for display. Pure — safe on server. */
export function shorten(value: string): string {
  if (!value) return '';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
