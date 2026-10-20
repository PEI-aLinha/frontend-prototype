// Items the designated manager can assign. The technical questions are real questions of the assessment (same id and text),
// so the analyst's answer reaches the questionnaire; the evidence and the asset task are mock items.

export interface AssignableItem {
  id: string
  title: string
  context: string
}

export const TECHNICAL_QUESTIONS: AssignableItem[] = [
  { id: 'q-backups', title: 'As cópias de segurança dos sistemas críticos são feitas regularmente e a reposição é testada?', context: 'Avaliação de maturidade · Continuidade do negócio' },
  { id: 'q-acessos-admin', title: 'As contas de administrador são usadas só para tarefas de administração?', context: 'Avaliação de maturidade · Controlo de acessos' },
  { id: 'q-acessos-remoto', title: 'O acesso remoto à rede da empresa é feito de forma segura, por exemplo por VPN?', context: 'Avaliação de maturidade · Controlo de acessos' },
  { id: 'q-inc-registos', title: 'Os registos (logs) dos sistemas críticos são guardados e consultados?', context: 'Avaliação de maturidade · Gestão de incidentes' },
  { id: 'q-ativos-software', title: 'Só é instalado software autorizado nos computadores da empresa?', context: 'Avaliação de maturidade · Gestão de ativos' },
]

export const EVIDENCE: AssignableItem[] = [
  { id: 'e-backups', title: 'Registo das cópias de segurança dos servidores (últimos 30 dias), com um teste de reposição', context: 'Evidência · Continuidade do negócio' },
  { id: 'e-mfa', title: 'Configuração do MFA nas contas de administrador', context: 'Evidência · Controlo de acessos' },
  { id: 'e-updates', title: 'Relatório das atualizações instaladas nos servidores', context: 'Evidência · Gestão de vulnerabilidades' },
]

export const ASSET_TASK: AssignableItem = { id: 't-ativos', title: 'Registar os ativos técnicos: servidores, rede e sistemas de produção', context: 'Inventário de ativos' }
