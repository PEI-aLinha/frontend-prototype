// Catálogo simulado de plugins Provider (RF37). Todos só de leitura.
import type { CollectedEvidence, DiscoveredAsset, ProviderId, ProviderInfo } from '../contracts'

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'microsoft365', name: 'Microsoft 365 e Entra ID', category: 'Identidade e email',
    description: 'Contas de utilizador, autenticação multifator e serviços de email e documentos.',
    reads: ['Lista de utilizadores e administradores', 'Estado da autenticação multifator (MFA) por conta', 'Domínios e serviços ativos'],
    brings: ['Ativo "Microsoft 365" no inventário', 'Evidência contínua do MFA (ação do roadmap)'],
    applies: true,
  },
  {
    id: 'intune', name: 'Microsoft Intune', category: 'Equipamentos',
    description: 'Computadores e portáteis geridos pela empresa.',
    reads: ['Inventário de dispositivos geridos', 'Encriptação do disco', 'Versão do sistema operativo'],
    brings: ['Grupos de equipamentos sugeridos para o inventário', 'Evidência de encriptação dos portáteis'],
    applies: true,
  },
  {
    id: 'firewall', name: 'Firewall FortiGate', category: 'Rede',
    description: 'A firewall da fábrica e os acessos remotos por VPN.',
    reads: ['Configuração das regras (só leitura)', 'Utilizadores de VPN', 'Segmentos de rede'],
    brings: ['Ativo "VPN de acesso remoto"', 'Evidência da separação entre rede OT e administrativa'],
    applies: true,
  },
  {
    id: 'backups', name: 'Veeam Backup', category: 'Cópias de segurança',
    description: 'As tarefas de cópia de segurança e os testes de reposição.',
    reads: ['Tarefas de cópia e o seu resultado', 'Data do último teste de reposição'],
    brings: ['Ativo "Servidor de cópias Veeam"', 'Evidência dos testes de reposição'],
    applies: true,
  },
  {
    id: 'google', name: 'Google Workspace', category: 'Identidade e email',
    description: 'Alternativa ao Microsoft 365.', reads: ['Utilizadores e MFA'], brings: ['Ativo e evidência de MFA'], applies: false,
  },
  {
    id: 'aws', name: 'Amazon Web Services', category: 'Cloud',
    description: 'Servidores e serviços na cloud da Amazon.', reads: ['Recursos e configurações de segurança'], brings: ['Servidores cloud no inventário'], applies: false,
  },
]

type DiscoveryTemplate = Omit<DiscoveredAsset, 'id' | 'status' | 'resolvedAssetId'>
type EvidenceTemplate = Omit<CollectedEvidence, 'id' | 'collectedAt'>

export const DISCOVERIES: Record<ProviderId, DiscoveryTemplate[]> = {
  microsoft365: [
    { provider: 'microsoft365', name: 'Microsoft 365 (tenant compagueda.pt)', type: 'servico_cloud', details: '15 utilizadores · Exchange, SharePoint e Teams', suggestedServiceId: 'svc-faturacao', suggestedCriticality: 'medio', possibleMatchId: 'ast-email' },
  ],
  intune: [
    { provider: 'intune', name: 'Portáteis geridos (23)', type: 'equipamento', details: 'Windows 11 · 21 encriptados, 2 sem encriptação', suggestedServiceId: null, suggestedCriticality: 'baixo', possibleMatchId: 'ast-portateis' },
    { provider: 'intune', name: 'Computadores das linhas de produção (6)', type: 'equipamento', details: 'Windows 10 · sem atualizações desde março', suggestedServiceId: 'svc-producao', suggestedCriticality: 'alto', possibleMatchId: null },
  ],
  firewall: [
    { provider: 'firewall', name: 'VPN de acesso remoto', type: 'rede', details: '7 utilizadores · inclui o fornecedor dos PLC', suggestedServiceId: 'todos', suggestedCriticality: 'alto', possibleMatchId: null },
  ],
  backups: [
    { provider: 'backups', name: 'Servidor de cópias Veeam', type: 'servidor', details: 'Cópias diárias às 23h para o NAS', suggestedServiceId: 'svc-producao', suggestedCriticality: 'alto', possibleMatchId: null },
  ],
  google: [],
  aws: [],
}

export const EVIDENCE: Record<ProviderId, EvidenceTemplate[]> = {
  microsoft365: [
    { provider: 'microsoft365', title: 'Autenticação multifator nas contas', result: '9 de 15 contas com MFA · 2 administradores sem MFA', ok: false, strength: 'continuamente_verificada', remediationActionId: 'act-mfa' },
  ],
  intune: [
    { provider: 'intune', title: 'Encriptação dos portáteis', result: '21 de 23 portáteis encriptados', ok: false, strength: 'continuamente_verificada', remediationActionId: null },
  ],
  firewall: [
    { provider: 'firewall', title: 'Separação da rede de produção (OT)', result: 'Rede OT e administrativa no mesmo segmento', ok: false, strength: 'tecnicamente_verificada', remediationActionId: 'act-segmentar-ot' },
  ],
  backups: [
    { provider: 'backups', title: 'Cópias de segurança diárias', result: '30 de 30 cópias com sucesso no último mês', ok: true, strength: 'continuamente_verificada', remediationActionId: 'act-politica-backups' },
    { provider: 'backups', title: 'Teste de reposição', result: 'Nenhum teste de reposição registado', ok: false, strength: 'continuamente_verificada', remediationActionId: 'act-teste-backups' },
  ],
  google: [],
  aws: [],
}
