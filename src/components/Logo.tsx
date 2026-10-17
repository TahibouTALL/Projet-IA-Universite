// Marque : un petit tableau d'école quadrillé, avec un trait de craie
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#183f35" />
      <g stroke="#ffffff" strokeOpacity=".16" strokeWidth="1">
        <path d="M8.5 0v32M16.5 0v32M24.5 0v32M0 8.5h32M0 16.5h32M0 24.5h32" />
      </g>
      <rect x="6.5" y="19.5" width="13" height="3.6" rx="1.8" fill="#f2c94c" transform="rotate(-9 13 21.3)" />
    </svg>
  );
}

export function Wordmark({ name, light = false }: { name: string; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`text-[1.0625rem] font-bold tracking-[-0.01em] ${light ? "text-white" : "text-ink"}`}>{name}</span>
    </span>
  );
}
