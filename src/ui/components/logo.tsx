// Liwanag mark — a rising sun / beam of light over a ledger line.
export function LiwanagMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Liwanag">
      <title>Liwanag</title>
      <rect width="32" height="32" rx="9" fill="var(--color-ink)" />
      <circle cx="16" cy="18" r="6" fill="var(--color-glow)" />
      <g stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round">
        <line x1="16" y1="4" x2="16" y2="8" />
        <line x1="6" y1="8" x2="8.5" y2="10.5" />
        <line x1="26" y1="8" x2="23.5" y2="10.5" />
      </g>
      <line x1="7" y1="26" x2="25" y2="26" stroke="var(--color-glow)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
