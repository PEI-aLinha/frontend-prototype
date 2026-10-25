import type { Role } from '../api/contracts'

export type PersonaKey = 'rui' | 'pedro' | 'marta'

export interface Persona {
  key: PersonaKey
  userId: string
  name: string
  firstName: string
  initials: string
  role: Role
  subtitle: string
  description: string
}

// Personas from the technical report (§2.3). Used only by the demo switcher.
export const PERSONAS: Record<PersonaKey, Persona> = {
  rui: { key: 'rui', userId: 'u-rui', name: 'Rui Santos', firstName: 'Rui', initials: 'RS', role: 'responsavel', subtitle: 'Componentes Águeda', description: 'Responsável designado · diretor administrativo e financeiro' },
  pedro: { key: 'pedro', userId: 'u-pedro', name: 'Pedro Almeida', firstName: 'Pedro', initials: 'PA', role: 'analista', subtitle: 'Analista', description: 'Analista · técnico de informática externo' },
  marta: { key: 'marta', userId: 'u-marta', name: 'Marta Ferreira', firstName: 'Marta', initials: 'MF', role: 'consultor', subtitle: 'Consultora aLinha', description: 'Consultora · cerca de 12 PME' },
}

export const DEMO_ORG = 'componentes-agueda'

export function homePath(key: PersonaKey): string {
  if (key === 'marta') return '/carteira'
  if (key === 'pedro') return `/org/${DEMO_ORG}/tarefas`
  return `/org/${DEMO_ORG}/inicio`
}

export function isPersonaKey(v: string | null): v is PersonaKey {
  return v === 'rui' || v === 'pedro' || v === 'marta'
}
