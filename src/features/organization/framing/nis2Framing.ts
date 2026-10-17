import type { OrganizationProfile } from '../../../api/contracts'
import { sectorById } from '../sectors'

export type Nis2Class = 'essencial' | 'importante' | 'nao_abrangida'
export type CompanySize = 'pequena' | 'media' | 'grande'

export interface Nis2Framing {
  classification: Nis2Class
  size: CompanySize
  /** Facts that led to the suggestion, in plain language. */
  reasons: string[]
}

export const NIS2_LABEL: Record<Nis2Class, string> = {
  essencial: 'Entidade essencial',
  importante: 'Entidade importante',
  nao_abrangida: 'Não abrangida',
}

/** What each classification means for the company, in plain language. */
export const NIS2_MEANING: Record<Nis2Class, string[]> = {
  essencial: [
    'Tem de cumprir todas as obrigações de cibersegurança da lei.',
    'O CNCS pode fiscalizar a qualquer momento, mesmo sem incidentes.',
    'As coimas podem chegar a 10 milhões de euros ou 2% do volume de negócios.',
  ],
  importante: [
    'Tem de cumprir as mesmas obrigações de cibersegurança que as entidades essenciais.',
    'Em regra, o CNCS só fiscaliza depois de um incidente ou de uma queixa.',
    'As coimas podem chegar a 7 milhões de euros ou 1,4% do volume de negócios.',
  ],
  nao_abrangida: [
    'A lei de cibersegurança não obriga a empresa a registar-se no CNCS.',
    'Proteger os sistemas continua a ser uma boa prática, e o RGPD pode aplicar-se na mesma.',
  ],
}

/** EU Recommendation 2003/361 (simplified: workers or turnover). */
export function companySize(employees: number, turnover: number): CompanySize {
  if (employees >= 250 || turnover > 50_000_000) return 'grande'
  if (employees >= 50 || turnover > 10_000_000) return 'media'
  return 'pequena'
}

const SIZE_LABEL: Record<CompanySize, string> = { pequena: 'pequena empresa', media: 'média empresa', grande: 'grande empresa' }
const eur = (v: number) => `${(v / 1_000_000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} milhões de euros`

/**
 * Indicative NIS2 framing (RF02). Annex I + large → essential; Annex I or II + medium or large → important;
 * small companies or sectors outside the annexes → not covered. The official one is given by the CNCS.
 */
export function suggestNis2(p: OrganizationProfile): Nis2Framing {
  const sector = sectorById(p.sector)
  const size = companySize(p.employees, p.turnover)
  const reasons = [`${p.employees} trabalhadores e ${eur(p.turnover)} de volume de negócios: é uma ${SIZE_LABEL[size]}.`]
  if (!sector || sector.annex === null) {
    reasons.unshift('O setor de atividade não está entre os setores abrangidos pela lei.')
    return { classification: 'nao_abrangida', size, reasons }
  }
  reasons.unshift(`O setor "${sector.label}" está no Anexo ${sector.annex === 1 ? 'I (setores de importância crítica)' : 'II (outros setores críticos)'} da lei.`)
  if (size === 'pequena') return { classification: 'nao_abrangida', size, reasons }
  return { classification: sector.annex === 1 && size === 'grande' ? 'essencial' : 'importante', size, reasons }
}
