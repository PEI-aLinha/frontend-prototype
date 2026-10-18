import type { AnswerChoice } from '../../api/contracts'
import type { OptionItem } from '../../ui'

export const CHOICE_LABEL: Record<AnswerChoice, string> = { sim: 'Sim', parcial: 'Em parte', nao: 'Não', nao_sei: 'Não sei' }

export const CHOICES: OptionItem<AnswerChoice>[] = [
  { value: 'sim', label: 'Sim', hint: 'Está implementado em toda a empresa.' },
  { value: 'parcial', label: 'Em parte', hint: 'Só em alguns sistemas, equipas ou casos.' },
  { value: 'nao', label: 'Não', hint: 'Não está implementado.' },
  { value: 'nao_sei', label: 'Não sei', hint: 'Pode delegar a pergunta a quem saiba responder.' },
]
