// Mock items from the Assessment plugin (not built in this prototype): technical questions and evidence about backups and servers.

export interface AssignableItem {
  id: string
  title: string
  context: string
}

export const TECHNICAL_QUESTIONS: AssignableItem[] = [
  { id: 'q-backups', title: 'As cópias de segurança dos sistemas críticos são feitas regularmente e a reposição é testada?', context: 'Avaliação de maturidade · Continuidade do negócio' },
  { id: 'q-mfa', title: 'As contas de administrador usam autenticação multifator (MFA)?', context: 'Avaliação de maturidade · Controlo de acessos' },
  { id: 'q-updates', title: 'Os servidores recebem as atualizações de segurança no prazo de 30 dias?', context: 'Avaliação de maturidade · Gestão de vulnerabilidades' },
  { id: 'q-remote', title: 'O acesso remoto aos servidores é feito por VPN com autenticação multifator?', context: 'Avaliação de maturidade · Controlo de acessos' },
  { id: 'q-logs', title: 'Os acessos aos servidores ficam registados e são guardados durante pelo menos 6 meses?', context: 'Avaliação de maturidade · Registo e monitorização' },
]

export const EVIDENCE: AssignableItem[] = [
  { id: 'e-backups', title: 'Registo das cópias de segurança dos servidores (últimos 30 dias), com um teste de reposição', context: 'Evidência · Continuidade do negócio' },
  { id: 'e-mfa', title: 'Configuração do MFA nas contas de administrador', context: 'Evidência · Controlo de acessos' },
  { id: 'e-updates', title: 'Relatório das atualizações instaladas nos servidores', context: 'Evidência · Gestão de vulnerabilidades' },
]

export const ASSET_TASK: AssignableItem = { id: 't-ativos', title: 'Registar os ativos técnicos: servidores, rede e sistemas de produção', context: 'Inventário de ativos' }
