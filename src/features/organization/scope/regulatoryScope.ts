import type { AiUse, Organization } from '../../../api/contracts'
import { sectorById } from '../sectors'

export type FrameworkId = 'nis2' | 'rgpd' | 'aiact'
export type Applicability = 'aplica' | 'nao_aplica' | 'por_confirmar'

export interface FrameworkResult {
  id: FrameworkId
  name: string
  fullName: string
  applicability: Applicability
  /** Why it applies or not, in one sentence. */
  reason: string
  /** What it means for the company (only when it applies or is to be confirmed). */
  implications: string[]
}

/** Medium company or larger (EU Recommendation 2003/361): 50+ workers or turnover above 10 M€. */
export const isMediumOrLarger = (employees: number, turnover: number) => employees >= 50 || turnover > 10_000_000

const AI_IMPLICATIONS: Record<AiUse, string> = {
  chatbot: 'Avisar quem fala com o chatbot de que está a falar com uma máquina.',
  recrutamento: 'O software de recrutamento é de alto risco: uma pessoa tem de rever as decisões e os candidatos têm de ser informados (até 2 de dezembro de 2027).',
  assistente: 'Garantir que quem usa estas ferramentas sabe usá-las com cuidado, por exemplo sem colar dados de clientes.',
  outro: 'Confirmar com a consultora se o uso tem regras próprias.',
}

function nis2(org: Organization): FrameworkResult {
  const base = { id: 'nis2' as const, name: 'NIS2', fullName: 'Cibersegurança (Diretiva NIS2 e Regime Jurídico da Cibersegurança)' }
  const p = org.profile
  if (!p) return { ...base, applicability: 'por_confirmar', reason: 'Faltam os dados do registo da organização.', implications: [] }
  const sector = sectorById(p.sector)
  if (!sector || sector.annex === null) {
    return { ...base, applicability: 'nao_aplica', reason: 'O setor de atividade não está entre os setores abrangidos pela lei.', implications: [] }
  }
  if (!isMediumOrLarger(p.employees, p.turnover)) {
    return { ...base, applicability: 'nao_aplica', reason: 'A empresa é pequena: tem menos de 50 trabalhadores e um volume de negócios até 10 milhões de euros.', implications: [] }
  }
  return {
    ...base,
    applicability: 'aplica',
    reason: `O setor (${sector.label.toLowerCase()}) está abrangido e a empresa tem ${p.employees} trabalhadores.`,
    implications: [
      'Registar a empresa no CNCS e nomear um responsável de cibersegurança.',
      'Gerir os riscos de cibersegurança e aprovar as medidas na administração.',
      'Comunicar incidentes graves ao CNCS em 24 horas.',
    ],
  }
}

function rgpd(org: Organization): FrameworkResult {
  const base = { id: 'rgpd' as const, name: 'RGPD', fullName: 'Proteção de dados pessoais (RGPD)' }
  const s = org.scope!
  const who = [s.employeeData === 'sim' && 'dos trabalhadores', s.customerData === 'sim' && 'de clientes ou fornecedores'].filter(Boolean) as string[]
  if (who.length === 0) {
    return { ...base, applicability: 'nao_aplica', reason: 'Indicou que a empresa não guarda dados de pessoas. Se passar a guardar, esta lei aplica-se.', implications: [] }
  }
  return {
    ...base,
    applicability: 'aplica',
    reason: `A empresa guarda dados pessoais ${who.join(' e ')}.`,
    implications: [
      'Informar as pessoas sobre que dados guarda, para quê e durante quanto tempo.',
      'Proteger os dados, por exemplo com acessos controlados e cópias de segurança.',
      'Comunicar fugas de dados à CNPD em 72 horas.',
    ],
  }
}

function aiAct(org: Organization): FrameworkResult {
  const base = { id: 'aiact' as const, name: 'AI Act', fullName: 'Inteligência artificial (Regulamento da IA)' }
  const s = org.scope!
  if (s.usesAi === 'nao') return { ...base, applicability: 'nao_aplica', reason: 'Indicou que a empresa não usa sistemas de inteligência artificial.', implications: [] }
  if (s.usesAi === 'nao_sei') {
    return { ...base, applicability: 'por_confirmar', reason: 'Indicou que não sabe se a empresa usa inteligência artificial.', implications: ['A sua consultora ajuda a confirmar, por exemplo vendo os programas que a empresa usa.'] }
  }
  return {
    ...base,
    applicability: 'aplica',
    reason: 'A empresa usa sistemas de inteligência artificial.',
    implications: s.aiUses.map((u) => AI_IMPLICATIONS[u]),
  }
}

/** Regulatory scope (RF03): which of NIS2, RGPD and AI Act apply. Requires the scope answers. */
export function computeScope(org: Organization): FrameworkResult[] {
  return [nis2(org), rgpd(org), aiAct(org)]
}
