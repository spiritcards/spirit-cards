/**
 * Spirit Cards — inline vector icons (single stroke weight, brief §5).
 * Decorative only; callers pass aria-hidden or a label.
 */
type P = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function IconMine({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 21l6.5-6.5" />
      <path d="M9 14a5.5 5.5 0 0 1 7.8-7.8l-3.1 3.1" />
      <path d="M14 9l6.5-6.5" />
      <path d="M13.5 4.5l6 6" />
    </svg>
  );
}

export function IconMerge({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 8.5h4.5M14 17.5h4.5" />
      <path d="M18.5 5.5v13" />
      <path d="M16 8l2.5-2.5L21 8M16 18l2.5 2.5L21 18" />
    </svg>
  );
}

export function IconStake({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
      <path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </svg>
  );
}

export function IconBattle({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 4l7 7-2 2-7-7V4z" />
      <path d="M20 4l-7 7 2 2 7-7V4z" />
      <path d="M5.5 18.5l4-4M18.5 18.5l-4-4" />
      <path d="M9 15l-1.5-1.5M15 15l1.5-1.5" />
    </svg>
  );
}

export function IconCollection({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7" height="8" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconPoints({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3h12l-1.2 6.2a3.8 3.8 0 0 1-7.6 0z" />
      <path d="M12 15v3" />
      <path d="M8 21h8" />
      <path d="M12 15a5 5 0 0 0 5-5" />
      <path d="M12 15a5 5 0 0 1-5-5" />
    </svg>
  );
}

export function IconDocs({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function IconWallet({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
      <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMenu({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Brand mark — hexagon + ember diamond (matches the header wordmark logo). */export function BrandLogo({ className, size = 34 }: P) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="brandmark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1A12" />
          <stop offset="1" stopColor="#0E1116" />
        </linearGradient>
      </defs>
      <path d="M20 2 35 11v18L20 38 5 29V11z" fill="url(#brandmark-grad)" stroke="#E8B457" strokeWidth="1.5" />
      <path d="M20 10l4 10-4 10-4-10z" fill="#FF6A3D" />
    </svg>
  );
}

/** X (Twitter) glyph. */
export function IconX({ className, size = 20 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** GitHub glyph. */
export function IconGithub({ className, size = 20 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.723-1.335-1.723-1.091-.728.083-.713.083-.713 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.42-1.305.762-1.605-2.665-.294-5.466-1.335-5.466-5.94 0-1.312.47-2.386 1.235-3.227-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.653-.156 1.338-.234 2.045-.234 1.02.005 2.045.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.841 1.234 1.915 1.234 3.227 0 4.616-2.804 5.643-5.478 5.94.43.37.814 1.1.814 2.22 0 1.602-.015 2.894-.015 3.287 0 .316.216.683.825.567C20.565 21.917 24 17.5 24 12.292 24 5.78 18.627.5 12 .5z" />
    </svg>
  );
}

/** Telegram glyph. */
export function IconTelegram({ className, size = 20 }: P) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** OpenSea — a compass/ship-wheel style glyph. */
export function IconOpenSea({ className, size = 20 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" />
    </svg>
  );
}

/**
 * Element glyphs — one clean line icon per element (used by "Elements of Life"
 * and element chips). `element` is the catalog element id.
 */
export function ElementGlyph({ element, className, size = 20 }: P & { element: string }) {
  const common = base(size);
  switch (element) {
    case "fire":
      return (
        <svg {...common} className={className}>
          <path d="M12 3c2.2 3.2 4.5 5 4.5 8.2a4.5 4.5 0 0 1-9 0c0-1.6.7-2.7 1.6-3.7C10.4 8.3 11.5 6.2 12 3z" />
        </svg>
      );
    case "water":
      return (
        <svg {...common} className={className}>
          <path d="M12 3c3 4 5.5 6.4 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.4 9 7 12 3z" />
        </svg>
      );
    case "earth":
      return (
        <svg {...common} className={className}>
          <path d="M3 20l6.5-9 3 4L16 9l5 11z" />
          <path d="M3 20h18" />
        </svg>
      );
    case "air":
      return (
        <svg {...common} className={className}>
          <path d="M3 8h11a3 3 0 1 0-3-3" />
          <path d="M3 12h15a3 3 0 1 1-3 3" />
          <path d="M3 16h8" />
        </svg>
      );
    case "lightning":
      return (
        <svg {...common} className={className}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
        </svg>
      );
    case "ice":
      return (
        <svg {...common} className={className}>
          <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />
        </svg>
      );
    case "metal":
      return (
        <svg {...common} className={className}>
          <path d="M6 3h12l3 6-9 12L3 9z" />
          <path d="M3 9h18M9 9l3 12M15 9l-3 12" />
        </svg>
      );
    case "spirit":
      return (
        <svg {...common} className={className}>
          <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" />
        </svg>
      );
    default:
      return (
        <svg {...common} className={className}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
