export function humanize(id: string): string {
  if (!id) return ''
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const formatEur = (n: number, fractionDigits = 0): string =>
  new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(n)

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('en-US').format(n)
