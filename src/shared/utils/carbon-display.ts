/** CO₂ equivalences for the report (humanise the carbon figure). */
export function carbonEquivalents(annualKg: number): {
  kmAuto: number
  alberiAnno: number
  smartphoneCariche: number
} {
  return {
    kmAuto: Math.round(annualKg / 0.12),
    alberiAnno: Math.round(annualKg / 21),
    smartphoneCariche: Math.round(annualKg / 0.0084),
  }
}
