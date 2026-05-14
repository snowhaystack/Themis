interface Props {
  /** Visual size in px (icon viewbox is 24, scales linearly). */
  size?: number
  /** Optional extra Tailwind classes (e.g. text color). */
  className?: string
}

/**
 * Themis — scales of justice. Monochrome SVG using currentColor.
 */
export function BrandMark({ size = 24, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Left pan */}
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      {/* Right pan */}
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      {/* Base */}
      <path d="M7 21h10" />
      {/* Column */}
      <path d="M12 3v18" />
      {/* Beam */}
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  )
}

interface WordmarkProps {
  /** Tailwind text-size class. */
  textClass?: string
  /** Icon size in px. */
  iconSize?: number
  /** Stack vertically. */
  stacked?: boolean
  /** Subtitle line (only with stacked). */
  subtitle?: string
}

export function BrandWordmark({
  textClass = 'text-lg',
  iconSize = 22,
  stacked = false,
  subtitle,
}: WordmarkProps) {
  if (stacked) {
    return (
      <div className="flex items-center gap-2.5">
        <BrandMark size={iconSize} className="text-fg" />
        <div className="flex flex-col leading-tight">
          <span
            className={`font-bold tracking-tight text-fg ${textClass}`}
            style={{ letterSpacing: '-0.01em' }}
          >
            Themis
          </span>
          {subtitle && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-2">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-2">
      <BrandMark size={iconSize} className="text-fg" />
      <span
        className={`font-bold tracking-tight text-fg ${textClass}`}
        style={{ letterSpacing: '-0.01em' }}
      >
        Themis
      </span>
    </div>
  )
}
