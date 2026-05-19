const LABEL_MAP: Record<string, string> = {
  manifatturiero: 'Manufacturing',
  sanitario: 'Healthcare',
  servizi_professionali: 'Professional services',
  logistica: 'Logistics',
  energia_utilities: 'Energy / Utilities',
  media_entertainment: 'Media / Entertainment',
  pubblica_amministrazione: 'Public administration',
  altro: 'Other',
  analisi_documenti: 'Document analysis',
  analisi_immagini: 'Image analysis',
  analisi_audio: 'Audio analysis',
  sviluppo_software: 'Software development',
  decisioni: 'Decision support',
  helper_dipendenti: 'Employee assistant',
  flussi_aziendali: 'Business workflows',
  artigiano: 'Micro',
  piccola_azienda: 'Small business',
  media_azienda: 'Mid-size business',
}

export function humanize(id: string): string {
  if (!id) return ''
  if (LABEL_MAP[id]) return LABEL_MAP[id]
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
