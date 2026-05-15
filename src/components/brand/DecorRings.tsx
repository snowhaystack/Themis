interface Props {
  className?: string
}

/**
 * Decorative concentric rings — the pitch deck's title-slide motif.
 * Three shapes share a centre pinned to the top-right corner, so they
 * read as a quarter-circle emerging from the corner. Purely visual.
 */
export function DecorRings({ className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 600 600"
      preserveAspectRatio="xMaxYMin meet"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <circle
        cx="600"
        cy="0"
        r="450"
        fill="none"
        strokeWidth="1.5"
        className="stroke-accent/20"
      />
      <circle
        cx="600"
        cy="0"
        r="300"
        fill="none"
        strokeWidth="2.5"
        className="stroke-accent/40"
      />
      <circle cx="600" cy="0" r="105" className="fill-accent/90">
        <animate
          attributeName="r"
          values="100;112;100"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  )
}
