interface Props {
  className?: string
}

/**
 * Decorative concentric rings — the pitch deck's title-slide motif.
 * Three shapes share a centre pinned to the top-right corner. A
 * multi-colour gradient (the four agent hues) slowly rotates through
 * them for a living, shifting effect. Purely visual.
 */
export function DecorRings({ className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 600 600"
      preserveAspectRatio="xMaxYMin meet"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <defs>
        <linearGradient id="decor-rings-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--agent1))' }} />
          <stop offset="35%" style={{ stopColor: 'rgb(var(--agent2))' }} />
          <stop offset="70%" style={{ stopColor: 'rgb(var(--agent3))' }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--agent4))' }} />
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0 0.5 0.5"
            to="360 0.5 0.5"
            dur="14s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      <circle
        cx="600"
        cy="0"
        r="450"
        fill="none"
        stroke="url(#decor-rings-grad)"
        strokeWidth="1.5"
        opacity="0.35"
      />
      <circle
        cx="600"
        cy="0"
        r="300"
        fill="none"
        stroke="url(#decor-rings-grad)"
        strokeWidth="2.5"
        opacity="0.6"
      />
      <circle
        cx="600"
        cy="0"
        r="105"
        fill="url(#decor-rings-grad)"
        opacity="0.9"
      />
    </svg>
  )
}
