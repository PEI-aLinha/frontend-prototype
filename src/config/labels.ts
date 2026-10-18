import type { ActionStatus, AssetType, Id, Level, RiskStatus, Role, Treatment, User } from '../api/contracts'

export const CRITICALITY_LABEL: Record<Level, string> = { alto: 'Alta', medio: 'Média', baixo: 'Baixa' }
export const RISK_LEVEL_LABEL: Record<Level, string> = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' }

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  servidor: 'Servidor',
  rede: 'Rede',
  aplicacao: 'Aplicação',
  base_dados: 'Base de dados',
  equipamento: 'Equipamento',
  servico_cloud: 'Serviço cloud',
  armazenamento: 'Armazenamento',
  sistema_producao_ot: 'Sistema de produção (OT)',
  outro: 'Outro',
}

export const TREATMENT_LABEL: Record<Treatment, string> = {
  mitigar: 'Mitigar',
  aceitar: 'Aceitar',
  evitar: 'Evitar',
  partilhar: 'Partilhar',
}

export const TREATMENT_HINT: Record<Treatment, string> = {
  mitigar: 'Reduzir o risco com ações do roadmap (ISO/IEC 27005: modificar).',
  aceitar: 'Manter o risco como está, com uma justificação (reter).',
  evitar: 'Deixar de fazer a atividade que cria o risco.',
  partilhar: 'Transferir parte do risco, por exemplo para um seguro ou fornecedor.',
}

export const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  por_tratar: 'Por tratar',
  em_tratamento: 'Em tratamento',
  tratado: 'Tratado',
  aceite: 'Aceite',
  arquivado: 'Arquivado',
}

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  por_iniciar: 'Por iniciar',
  em_curso: 'Em curso',
  concluida: 'Concluída',
}

export const ROLE_LABEL: Record<Role, string> = {
  responsavel: 'Responsável designado',
  analista: 'Analista',
  consultor: 'Consultora',
}

const WEEKDAYS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function parse(iso: string): Date {
  return iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)
}

/** "qui., 15 out." */
export function shortDay(iso: string): string {
  const d = parse(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "Quinta-feira, 15 de outubro" */
export function longDay(iso: string): string {
  const d = parse(iso)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
}

/** "15 out. 2026" */
export function shortDate(iso: string): string {
  const d = parse(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "16 out. · 15:40" */
export function dateTime(iso: string): string {
  const d = parse(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`
}

export type DueTone = 'late' | 'soon' | 'ok'

/**
 * Who filled the inventory, for the captions on the asset screens: "Rui Santos e Pedro Almeida",
 * or "A, B e C" for three or more. Empty when nobody is known, so the caller can drop the clause.
 */
export function authorNames(assets: readonly { createdBy: Id }[], users: readonly User[]): string {
  const names = [...new Set(assets.map((a) => a.createdBy))]
    .map((id) => users.find((u) => u.id === id)?.name)
    .filter((n): n is string => !!n)
  if (names.length < 2) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/** Due date status relative to the demo's "today". */
export function dueStatus(due: string, today: string): { label: string; tone: DueTone } {
  const days = Math.round((parse(due).getTime() - parse(today).getTime()) / 86_400_000)
  if (days < 0) return { label: `Atrasada ${-days} ${days === -1 ? 'dia' : 'dias'}`, tone: 'late' }
  if (days === 0) return { label: 'Termina hoje', tone: 'soon' }
  if (days === 1) return { label: 'Termina amanhã', tone: 'soon' }
  return { label: `Faltam ${days} dias`, tone: 'ok' }
}
