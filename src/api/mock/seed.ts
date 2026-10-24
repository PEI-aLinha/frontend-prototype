// Demo data (docs/prompt-ativos-riscos.md, "Dados de demonstração"). Dates in October 2026.
import type {
  AppNotification, Asset, ChatConversation, Consultant, TeamMember, CollectedEvidence, DiscoveredAsset, IntegrationConnection, ProviderId, AssetComment, AuditEntry, CriticalService, Organization, PortfolioClient, RemediationAction,
  Risk, RiskActionLink, RoadmapStatus, Task, User, AnswerChoice, QuestionAnswer,
} from '../contracts'

export type SnapshotId = 'c0' | 'c1' | 'c2' | 'c3'

/** aLinha consultants. Marta's active clients are her portfolio; the others only have a count. */
export interface ConsultantRecord extends Consultant {
  /** Active clients outside the prototype (Marta's are counted from the portfolio). */
  otherActiveClients: number
}

export interface DemoState {
  version: number
  consultants: ConsultantRecord[]
  members: TeamMember[]
  snapshot: SnapshotId
  users: User[]
  organizations: Organization[]
  services: CriticalService[]
  assets: Asset[]
  tasks: Task[]
  risks: Risk[]
  links: RiskActionLink[]
  comments: AssetComment[]
  actions: RemediationAction[]
  roadmap: Record<string, RoadmapStatus>
  /** Designated manager's answers in the maturity questionnaire, per organization and question. */
  answers: Record<string, Record<string, QuestionAnswer>>
  portfolio: PortfolioClient[]
  audit: AuditEntry[]
  notifications: AppNotification[]
  chat: ChatConversation[]
  today: string
  connections: Partial<Record<ProviderId, Omit<IntegrationConnection, 'provider'>>>
  discoveries: DiscoveredAsset[]
  evidence: CollectedEvidence[]
}

export const STATE_VERSION = 12
export const ORG_ID = 'org-ca'
export const ORG_SLUG = 'componentes-agueda'
export const RUI = 'u-rui'
export const PEDRO = 'u-pedro'
export const MARTA = 'u-marta'
export const ASSET_TASK_ID = 'task-ativos'

const at = (day: number, time = '10:00') => `2026-10-${String(day).padStart(2, '0')}T${time}:00`

const USERS: User[] = [
  { id: RUI, name: 'Rui Santos', initials: 'RS', role: 'responsavel', organizationId: ORG_ID, title: 'Responsável designado', email: 'rui.santos@compagueda.pt' },
  { id: PEDRO, name: 'Pedro Almeida', initials: 'PA', role: 'analista', organizationId: ORG_ID, title: 'Analista', email: 'pedro.almeida@tiagueda.pt' },
  { id: MARTA, name: 'Marta Ferreira', initials: 'MF', role: 'consultor', organizationId: null, title: 'Consultora aLinha', email: 'marta.ferreira@alinha.pt' },
]

const CONSULTANTS: ConsultantRecord[] = [
  { id: MARTA, name: 'Marta Ferreira', initials: 'MF', heading: 'A sua consultora', email: 'marta.ferreira@alinha.pt', phone: '913456210', otherActiveClients: 0 },
  { id: 'u-joao', name: 'João Pereira', initials: 'JP', heading: 'O seu consultor', email: 'joao.pereira@alinha.pt', phone: '913456211', otherActiveClients: 14 },
]

const MEMBERS: TeamMember[] = [
  { id: 'mbr-rui', organizationId: ORG_ID, userId: RUI, name: 'Rui Santos', email: 'rui.santos@compagueda.pt', role: 'responsavel', status: 'ativo', invitedAt: null, invitedBy: null, joinedAt: '2026-10-09T09:20:00' },
  { id: 'mbr-pedro', organizationId: ORG_ID, userId: PEDRO, name: 'Pedro Almeida', email: 'pedro.almeida@tiagueda.pt', role: 'analista', status: 'ativo', invitedAt: '2026-10-09T10:30:00', invitedBy: RUI, joinedAt: '2026-10-09T18:05:00' },
  { id: 'mbr-ana', organizationId: ORG_ID, userId: null, name: 'Ana Costa', email: 'ana.costa@compagueda.pt', role: 'analista', status: 'convite_pendente', invitedAt: '2026-10-12T11:00:00', invitedBy: RUI, joinedAt: null },
]

const ORG: Organization = {
  id: ORG_ID,
  slug: ORG_SLUG,
  name: 'Componentes Águeda, Lda.',
  description: 'Fábrica de componentes para automóveis em Águeda · 120 trabalhadores',
  classification: 'Entidade importante (sugestão indicativa)',
  frameworks: ['NIS2 / RJC', 'RGPD'],
  consultantId: MARTA,
  consultantAssignedAt: '2026-10-09T09:20:00',
  profile: {
    nif: '509180027',
    cae: '29320',
    sector: 'industria',
    subsector: 'automoveis',
    services: 'Fabrico de componentes metálicos e plásticos para a indústria automóvel, para fabricantes em Portugal e no resto da Europa.',
    employees: 120,
    turnover: 18_500_000,
    address: { street: 'Rua da Zona Industrial do Casarão, 45', postalCode: '3750-750', city: 'Águeda' },
    contacts: { phone: '234600120', email: 'geral@compagueda.pt' },
    permanentContact: { name: 'Rui Santos', phone: '912345678' },
  },
  registeredBy: RUI,
  registeredAt: '2026-10-09T09:20:00',
  // Scenario 1 of the report: personal data of employees and customers, no AI systems.
  scope: { employeeData: 'sim', customerData: 'sim', usesAi: 'nao', aiUses: [], answeredBy: RUI, answeredAt: '2026-10-09T09:31:00' },
}

const SERVICES: CriticalService[] = [
  { id: 'svc-producao', organizationId: ORG_ID, name: 'Produção de componentes', ownerId: RUI, criticality: 'alto' },
  { id: 'svc-faturacao', organizationId: ORG_ID, name: 'Faturação e expedição', ownerId: RUI, criticality: 'alto' },
]

function asset(id: string, name: string, type: Asset['type'], svc: Asset['criticalServiceId'], owner: string, criticality: Asset['criticality'], day: number, extra: Partial<Asset> = {}): Asset {
  return { id, organizationId: ORG_ID, name, type, criticalServiceId: svc, ownerId: owner, criticality, createdBy: owner, createdAt: at(day), updatedAt: at(day), ...extra }
}

const ASSETS_RUI: Asset[] = [
  asset('ast-erp', 'ERP de gestão e faturação', 'aplicacao', 'svc-faturacao', RUI, 'alto', 9, { location: 'Cloud do fornecedor', dependsOn: ['ast-email'] }),
  asset('ast-email', 'Email e documentos (cloud)', 'servico_cloud', 'svc-faturacao', RUI, 'medio', 9, { location: 'Microsoft 365' }),
  asset('ast-portateis', 'Portáteis da administração (4)', 'equipamento', null, RUI, 'baixo', 9, { location: 'Escritório' }),
]

const pedroAsset = (id: string, name: string, type: Asset['type'], svc: Asset['criticalServiceId'], location: string, time: string, dependsOn: string[] = []) =>
  asset(id, name, type, svc, PEDRO, 'alto', 15, { location, dependsOn, taskId: ASSET_TASK_ID, createdAt: at(15, time), updatedAt: at(15, time) })

const ASSETS_PEDRO: Asset[] = [
  pedroAsset('ast-servidor', 'Servidor de produção', 'servidor', 'svc-producao', 'Sala técnica', '09:10', ['ast-rede', 'ast-nas']),
  pedroAsset('ast-nas', 'NAS de cópias de segurança', 'armazenamento', 'svc-producao', 'Sala técnica', '09:18', ['ast-rede']),
  pedroAsset('ast-rede', 'Rede e firewall', 'rede', 'todos', 'Sala técnica', '09:25'),
  pedroAsset('ast-plc', 'PLC das linhas de montagem', 'sistema_producao_ot', 'svc-producao', 'Pavilhão 2', '09:41', ['ast-rede', 'ast-servidor']),
]

const QUESTION_TASK: Task = {
  id: 'task-pergunta-backups', organizationId: ORG_ID, kind: 'pergunta', questionId: 'q-backups',
  title: 'As cópias de segurança dos sistemas críticos são feitas regularmente e a reposição é testada?',
  context: 'Avaliação de maturidade · Continuidade do negócio', assigneeId: PEDRO, assignedBy: RUI,
  dueDate: '2026-10-13', status: 'concluida', createdAt: at(12),
  answer: { choice: 'parcial', note: 'Sim, mas a reposição nunca foi testada.' },
}

const MFA_QUESTION: Task = {
  id: 'task-pergunta-mfa', organizationId: ORG_ID, kind: 'pergunta', questionId: 'q-mfa',
  title: 'As contas de administrador usam autenticação multifator (MFA)?',
  context: 'Avaliação de maturidade · Controlo de acessos', assigneeId: PEDRO, assignedBy: RUI,
  dueDate: '2026-10-16', status: 'pendente', createdAt: at(13, '09:10'),
  aiHelp: 'MFA significa pedir uma segunda prova além da senha, por exemplo um código no telemóvel. Para verificar no Microsoft 365: Centro de administração › Utilizadores › Autenticação multifator. Responda "Em parte" se só algumas contas de administrador a tiverem.',
}

/** Rui's answers in the maturity questionnaire (scenario 1). Delegated questions are answered through the analyst's task. */
const RUI_ANSWERS: Record<string, AnswerChoice> = {
  'q-gov-politica': 'sim', 'q-gov-responsavel': 'sim', 'q-gov-gerencia': 'parcial', 'q-gov-formacao-gerencia': 'nao',
  'q-gov-formacao': 'parcial', 'q-gov-riscos': 'nao', 'q-gov-funcoes': 'parcial', 'q-gov-revisao': 'nao',
  'q-ativos-inventario': 'parcial', 'q-ativos-dono': 'sim', 'q-ativos-criticidade': 'parcial', 'q-ativos-dados': 'sim',
  'q-ativos-abate': 'nao', 'q-ativos-software': 'parcial',
  'q-acessos-contas': 'sim', 'q-acessos-saidas': 'parcial', 'q-acessos-minimo': 'parcial', 'q-acessos-revisao': 'nao',
  'q-acessos-senhas': 'sim', 'q-acessos-admin': 'parcial', 'q-acessos-remoto': 'sim',
  'q-cont-copia-fora': 'nao', 'q-cont-plano': 'nao', 'q-cont-tempo': 'parcial', 'q-cont-energia': 'sim',
  'q-cont-contactos': 'sim', 'q-cont-teste': 'nao',
  'q-inc-procedimento': 'nao', 'q-inc-reportar': 'parcial', 'q-inc-cncs': 'sim', 'q-inc-registo': 'nao',
  'q-forn-lista': 'sim', 'q-forn-contratos': 'parcial',
}

/** All answers at submission (scenarios 2 and 3; the MFA question is no longer delegated there). */
const RUI_ANSWERS_SUBMITTED: Record<string, AnswerChoice> = {
  ...RUI_ANSWERS, 'q-mfa': 'parcial', 'q-acessos-wifi': 'sim', 'q-inc-antivirus': 'sim', 'q-inc-registos': 'parcial',
  'q-forn-acessos': 'parcial', 'q-forn-avaliacao': 'nao', 'q-forn-cloud': 'sim',
}

const answers = (choices: Record<string, AnswerChoice>): Record<string, QuestionAnswer> =>
  Object.fromEntries(Object.entries(choices).map(([id, choice]) => [id, { choice }]))

const ASSET_TASK: Task = {
  id: ASSET_TASK_ID, organizationId: ORG_ID, kind: 'ativos',
  title: 'Registar servidores, rede e sistemas de produção', scope: 'Servidores, rede e sistemas de produção', context: 'Inventário de ativos',
  assigneeId: PEDRO, assignedBy: RUI, dueDate: '2026-10-15', status: 'pendente', expectedCount: 4, createdAt: at(13, '11:20'),
}

function action(id: string, priority: number, description: string, legalObligation: string, requiredEvidence: string, findingTitle: string, controlCode: string, dueDate: string, assignedTo: string | null): RemediationAction {
  return {
    id, organizationId: ORG_ID, findingId: `fnd-${id.slice(4)}`, description, priority, dueDate, assignedTo,
    requiredEvidence, status: 'por_iniciar', aiOutputId: `ai-roadmap-${id.slice(4)}`, legalObligation, findingTitle, controlCode, proposedBy: null,
  }
}

const ACTIONS: RemediationAction[] = [
  action('act-myciber', 1, 'Registar a entidade no MyCiber', 'RJC (DL 125/2025), art. 25.º — registo junto do CNCS', 'Comprovativo de registo no MyCiber', 'Entidade ainda não registada junto do CNCS', 'GOV.01', '2026-11-15', RUI),
  action('act-politica-backups', 2, 'Criar política de cópias de segurança', 'NIS2, art. 21.º, n.º 2, al. c) — continuidade das atividades', 'Política aprovada pela administração', 'Sem política formal de cópias de segurança', 'CN.02', '2026-11-30', RUI),
  action('act-formacao', 3, 'Formação de sensibilização dos trabalhadores', 'NIS2, art. 21.º, n.º 2, al. g) — ciber-higiene e formação', 'Registo de presenças e conteúdos da formação', 'Trabalhadores sem formação em cibersegurança', 'FS.01', '2026-12-15', RUI),
  action('act-mfa', 4, 'Implementar autenticação multifator (MFA) nos acessos remotos e nas contas de administração', 'NIS2, art. 21.º, n.º 2, al. j) — autenticação multifator', 'Captura da configuração de MFA e lista de contas abrangidas', 'Acessos remotos só com palavra-passe', 'CA.03', '2026-12-31', PEDRO),
  action('act-teste-backups', 5, 'Testar a reposição das cópias de segurança', 'NIS2, art. 21.º, n.º 2, al. c) — gestão de cópias de segurança', 'Relatório do teste de reposição com data e resultado', 'Reposição das cópias nunca testada', 'CN.03', '2027-01-15', PEDRO),
  action('act-segmentar-ot', 6, 'Segmentar a rede de produção (OT) da rede administrativa', 'NIS2, art. 21.º, n.º 2, al. a) e e) — segurança das redes', 'Diagrama de rede e regras da firewall', 'Rede de produção e administrativa sem separação', 'RD.02', '2027-02-28', PEDRO),
  action('act-inventario-lista', 7, 'Comunicar a Lista de Ativos ao CNCS', 'Regulamento n.º 756/2026 — Lista de Ativos', 'Comprovativo de submissão da Lista de Ativos', 'Lista de Ativos por comunicar', 'GOV.04', '2027-01-31', RUI),
]

function risk(id: string, threat: string, description: string, assetId: string | null, probability: number, impact: number, day: number, extra: Partial<Risk> = {}): Risk {
  return {
    id, organizationId: ORG_ID, assetId, threat, description, ownerId: RUI, probability, impact, treatment: null,
    status: 'por_tratar', createdBy: MARTA, createdAt: at(day, '15:00'), updatedAt: at(day, '15:00'), ...extra,
  }
}

const OTHER_RISKS: Risk[] = [
  risk('rsk-backups', 'Perda de dados por cópias de segurança nunca testadas', 'As cópias são feitas todas as noites para o NAS, mas a reposição nunca foi testada. Numa falha, podemos descobrir tarde demais que não servem.', 'ast-nas', 2, 2, 16, {
    plainLanguage: 'Se os dados se perderem, pode não ser possível recuperá-los a partir das cópias.',
  }),
  risk('rsk-erp-mfa', 'Acesso não autorizado ao ERP por falta de MFA', 'O ERP é acessível a partir de fora só com palavra-passe. Uma palavra-passe roubada dá acesso a faturação e dados de clientes.', 'ast-erp', 2, 2, 16, {
    plainLanguage: 'Alguém com uma palavra-passe roubada pode entrar no ERP e mexer em faturas.',
  }),
  risk('rsk-ot', 'Paragem da produção por falha na rede OT', 'Os PLC das linhas de montagem estão na mesma rede que os computadores do escritório. Um problema no escritório pode chegar à produção.', 'ast-plc', 1, 3, 16, {
    plainLanguage: 'Um problema informático no escritório pode parar as linhas de montagem.',
  }),
  risk('rsk-email', 'Fuga de dados pessoais dos trabalhadores através do email cloud', 'Recibos e dados de RH circulam por email e em pastas partilhadas sem regras de acesso.', 'ast-email', 1, 2, 16, {
    ownerId: RUI,
    plainLanguage: 'Dados pessoais dos trabalhadores podem ser vistos por quem não devia (RGPD).',
  }),
]

const PHISHING: Risk = risk('rsk-phishing', 'Phishing aos trabalhadores', 'Os trabalhadores nunca tiveram formação e recebem emails de faturas falsas. Um clique pode dar acesso ao email e ao ERP.', null, 2, 2, 16, {
  plainLanguage: 'Um email falso pode enganar um trabalhador e abrir a porta a um ataque.',
})

const RANSOMWARE: Risk = risk('rsk-ransomware', 'Ransomware no servidor de produção', 'Um ataque de ransomware cifra o servidor de produção e as cópias acessíveis na rede. A produção para até repor os sistemas.', 'ast-servidor', 2, 3, 16, {
  treatment: 'mitigar', status: 'em_tratamento', residualProbability: 1, residualImpact: 3, createdAt: at(16, '15:40'), updatedAt: at(16, '15:40'),
  plainLanguage: 'Um vírus pode bloquear o servidor e parar a produção durante dias.',
})

const OTHER_CLIENTS: Array<[string, string, number, string, PortfolioClient['stageTone'], string]> = [
  ['Metalúrgica do Vouga, S.A.', 'Metalomecânica', 210, 'Roadmap em curso', 'neutral', '6 de 14 ações concluídas'],
  ['Clínica Dentária Sorriso Aveiro', 'Saúde', 18, 'Avaliação em curso', 'neutral', 'Questionário a 60 %'],
  ['Transportes Bairrada, Lda.', 'Transportes rodoviários', 85, 'Por validar', 'signal', 'Rever avaliação submetida'],
  ['Cerâmica Ílhavo Design', 'Cerâmica', 64, 'Roadmap em curso', 'neutral', 'Prazo de MFA a 30 out.'],
  ['AquaPura Águas do Centro', 'Água e saneamento', 132, 'Incidente aberto', 'dark', 'Notificação inicial ao CNCS enviada'],
  ['Gráfica Litoral, Lda.', 'Indústria gráfica', 41, 'Onboarding', 'neutral', 'A convidar a equipa'],
  ['Laticínios Serra da Freita', 'Alimentar', 97, 'Roadmap em curso', 'neutral', '3 evidências por rever'],
  ['Hotel Ria Formosa Aveiro', 'Alojamento', 55, 'Avaliação em curso', 'neutral', 'Questionário a 35 %'],
  ['Moldes Precisão Oliveira', 'Moldes', 150, 'Roadmap validado', 'neutral', 'Revisão trimestral em jan.'],
  ['Farmácia Central de Ílhavo', 'Saúde', 12, 'Onboarding', 'neutral', 'Enquadramento por confirmar'],
  ['LogiCentro Armazéns, S.A.', 'Logística', 176, 'Roadmap em curso', 'neutral', '9 de 21 ações concluídas'],
]

function portfolio(snapshot: SnapshotId): PortfolioClient[] {
  const ca: PortfolioClient = {
    organization: ORG, sector: 'Fabrico de componentes para automóveis', employees: 120,
    stage: snapshot === 'c3' ? 'Roadmap validado' : 'Avaliação concluída',
    stageTone: snapshot === 'c3' ? 'neutral' : 'signal',
    nextStep: snapshot === 'c3' ? 'Acompanhar ações de risco alto' : 'Registar riscos e validar roadmap',
    updatedAt: at(16, '09:00'),
  }
  const others = OTHER_CLIENTS.map(([name, sector, employees, stage, stageTone, nextStep], i): PortfolioClient => ({
    organization: { id: `org-${i}`, slug: `cliente-${i}`, name, description: sector, classification: '', frameworks: ['NIS2 / RJC', 'RGPD'], consultantId: MARTA },
    sector, employees, stage, stageTone, nextStep, updatedAt: at(Math.max(1, 15 - i), '17:00'),
  }))
  return snapshot === 'c0' ? others : [ca, ...others]
}

let auditSeq = 0
function audit(day: number, time: string, userId: string | null, action: string, entityType: AuditEntry['entityType'], entityId: string, summary: string, after: Record<string, unknown> | null = null, actorType: AuditEntry['actorType'] = 'user'): AuditEntry {
  auditSeq += 1
  return { id: `aud-seed-${auditSeq}`, organizationId: ORG_ID, actorType, userId, action, entityType, entityId, summary, before: null, after, createdAt: at(day, time) }
}

function baseAudit(): AuditEntry[] {
  return [
    audit(9, '10:00', RUI, 'create', 'critical_service', 'svc-producao', 'Criou o serviço crítico "Produção de componentes"'),
    audit(9, '10:02', RUI, 'create', 'critical_service', 'svc-faturacao', 'Criou o serviço crítico "Faturação e expedição"'),
    ...ASSETS_RUI.map((a, i) => audit(9, `10:1${i}`, RUI, 'create', 'asset', a.id, `Registou o ativo "${a.name}"`, { criticality: a.criticality })),
  ]
}

/** "Adesão": the company is not registered yet; only Marta and her other clients exist. */
function emptySnapshot(): DemoState {
  return {
    version: STATE_VERSION, consultants: CONSULTANTS, members: [], snapshot: 'c0', users: USERS.filter((u) => u.id === MARTA), organizations: [], services: [], assets: [], tasks: [],
    risks: [], links: [], comments: [], actions: [], roadmap: {}, answers: {}, portfolio: portfolio('c0'), audit: [], notifications: [], chat: [], today: '2026-10-09',
    connections: {}, discoveries: [], evidence: [],
  }
}

export function buildSnapshot(snapshot: SnapshotId): DemoState {
  if (snapshot === 'c0') return emptySnapshot()
  auditSeq = 0
  const c1 = snapshot === 'c1'
  const entries = baseAudit()
  const roadmap: RoadmapStatus = { validated: false, validatedAt: null, validatedBy: null, assessmentCompletedAt: c1 ? null : at(14, '10:12') }
  let assets = [...ASSETS_RUI]
  let tasks: Task[] = [QUESTION_TASK, c1 ? MFA_QUESTION : { ...MFA_QUESTION, status: 'concluida', answer: { choice: 'parcial', note: 'Só o meu e o do Rui. Os outros 2 administradores não têm.' } }]
  let risks: Risk[] = []
  let links: RiskActionLink[] = []
  const comments: AssetComment[] = []
  let actions = ACTIONS

  if (!c1) {
    assets = [...ASSETS_RUI, ...ASSETS_PEDRO]
    tasks = [QUESTION_TASK, { ...ASSET_TASK, status: 'concluida' }]
    entries.push(audit(13, '11:20', RUI, 'assign', 'task', ASSET_TASK_ID, 'Atribuiu ao Pedro Almeida o registo de servidores, rede e sistemas de produção'))
    entries.push(...ASSETS_PEDRO.map((a) => audit(15, a.createdAt.slice(11, 16), PEDRO, 'create', 'asset', a.id, `Registou o ativo "${a.name}"`, { criticality: a.criticality })))
    entries.push(audit(15, '09:42', PEDRO, 'complete', 'task', ASSET_TASK_ID, 'Concluiu a tarefa de registo de ativos (4 registados)'))
    entries.push(audit(14, '10:20', null, 'propose', 'roadmap', ORG_ID, 'Roadmap proposto pela IA a partir das lacunas da avaliação (por validar)', null, 'ai'))
    risks = [...OTHER_RISKS, PHISHING].map((r) => ({ ...r, reviewDate: '2027-04-16' }))
    entries.push(...[...OTHER_RISKS, PHISHING].map((r) => audit(16, '15:00', MARTA, 'create', 'risk', r.id, `Registou o risco "${r.threat}"`)))
    comments.push({ id: 'cmt-plc', assetId: 'ast-plc', authorId: MARTA, body: 'Bom registo. Confirme se os PLC têm acesso remoto do fornecedor — isso muda a análise de riscos.', createdAt: at(16, '14:30') })
    entries.push(audit(16, '14:30', MARTA, 'comment', 'comment', 'ast-plc', 'Comentou o ativo "PLC das linhas de montagem"'))
  }

  if (snapshot === 'c3') {
    const c3Risks: Risk[] = [
      RANSOMWARE,
      { ...OTHER_RISKS[0], treatment: 'mitigar', status: 'em_tratamento' },
      { ...OTHER_RISKS[1], treatment: 'mitigar', status: 'em_tratamento' },
      { ...OTHER_RISKS[2], treatment: 'mitigar', status: 'em_tratamento' },
      { ...OTHER_RISKS[3], treatment: 'aceitar', status: 'aceite', acceptanceJustification: 'Risco baixo. Revemos as permissões das pastas de RH na revisão trimestral.' },
      { ...PHISHING, treatment: 'mitigar', status: 'em_tratamento' },
    ]
    risks = c3Risks.map((r) => ({ ...r, reviewDate: r.id === 'rsk-email' ? '2026-10-10' : '2027-04-16' }))
    links = [
      { id: 'lnk-1', riskId: 'rsk-ransomware', remediationActionId: 'act-mfa' },
      { id: 'lnk-2', riskId: 'rsk-ransomware', remediationActionId: 'act-teste-backups' },
      { id: 'lnk-3', riskId: 'rsk-backups', remediationActionId: 'act-teste-backups' },
      { id: 'lnk-4', riskId: 'rsk-erp-mfa', remediationActionId: 'act-mfa' },
      { id: 'lnk-5', riskId: 'rsk-ot', remediationActionId: 'act-segmentar-ot' },
      { id: 'lnk-6', riskId: 'rsk-phishing', remediationActionId: 'act-formacao' },
    ]
    roadmap.validated = true
    roadmap.validatedAt = at(16, '17:05')
    roadmap.validatedBy = MARTA
    actions = ACTIONS.map((a) => (a.id === 'act-mfa' || a.id === 'act-teste-backups' ? { ...a, status: 'em_curso' as const } : a))
    entries.push(audit(16, '15:40', MARTA, 'create', 'risk', RANSOMWARE.id, `Registou o risco "${RANSOMWARE.threat}"`))
    entries.push(audit(16, '15:41', MARTA, 'link', 'risk_action', RANSOMWARE.id, 'Ligou o risco às ações "MFA" e "Testar a reposição das cópias de segurança"'))
    entries.push(audit(16, '17:05', MARTA, 'validate', 'roadmap', ORG_ID, 'Validou o roadmap'))
  }

  return {
    version: STATE_VERSION,
    consultants: CONSULTANTS,
    members: MEMBERS,
    snapshot,
    users: USERS,
    organizations: [ORG],
    services: SERVICES,
    assets,
    tasks,
    risks,
    links,
    comments,
    actions,
    roadmap: { [ORG_ID]: roadmap },
    answers: { [ORG_ID]: answers(c1 ? RUI_ANSWERS : RUI_ANSWERS_SUBMITTED) },
    portfolio: portfolio(snapshot),
    audit: entries,
    notifications: seedNotifications(snapshot),
    chat: [],
    today: snapshot === 'c1' ? '2026-10-13' : '2026-10-16',
    connections: snapshot === 'c3' ? { microsoft365: { status: 'ligado', connectedBy: PEDRO, connectedAt: at(16, '11:00'), lastSyncAt: at(16, '17:30'), secretRef: 'openbao://alinha/org-ca/microsoft365', assignedTo: PEDRO } } : {},
    discoveries: snapshot === 'c3' ? [{ id: 'dsc-m365', provider: 'microsoft365', name: 'Microsoft 365 (tenant compagueda.pt)', type: 'servico_cloud', details: '15 utilizadores · Exchange, SharePoint e Teams', suggestedServiceId: 'svc-faturacao', suggestedCriticality: 'medio', possibleMatchId: 'ast-email', status: 'associado', resolvedAssetId: 'ast-email' }] : [],
    evidence: snapshot === 'c3' ? [{ id: 'evd-mfa', provider: 'microsoft365', title: 'Autenticação multifator nas contas', result: '9 de 15 contas com MFA · 2 administradores sem MFA', ok: false, strength: 'continuamente_verificada', remediationActionId: 'act-mfa', collectedAt: at(16, '17:30') }] : [],
  }
}

function seedNotifications(snapshot: SnapshotId): AppNotification[] {
  const n = (id: string, userId: string, kind: AppNotification['kind'], title: string, body: string, link: string | null, day: number, time: string, read = false): AppNotification =>
    ({ id, organizationId: ORG_ID, userId, kind, title, body, link, channels: ['app', 'email'], read, createdAt: at(day, time) })
  const base = [
    n('ntf-welcome', RUI, 'avaliacao', 'A Marta Ferreira é a sua consultora', 'Ela valida os resultados, o roadmap e os riscos antes de os ver.', '/org/componentes-agueda/inicio', 9, '09:30', true),
    n('ntf-q-done', RUI, 'tarefa_concluida', 'O Pedro respondeu à pergunta técnica', 'Cópias de segurança: "Sim, mas a reposição nunca foi testada".', '/org/componentes-agueda/avaliacao', 12, '16:20', true),
    n('ntf-pedro-q', PEDRO, 'tarefa', 'Nova tarefa: pergunta técnica', 'O Rui Santos pediu-lhe para responder a uma pergunta sobre cópias de segurança.', '/org/componentes-agueda/tarefas', 12, '10:05', true),
  ]
  if (snapshot === 'c1') return base
  const c2 = [
    n('ntf-pedro-assets', PEDRO, 'tarefa', 'Nova tarefa: registar ativos', 'Servidores, rede e sistemas de produção · até qui., 15 out.', '/org/componentes-agueda/tarefas/task-ativos/ativos', 13, '11:20', true),
    n('ntf-assets-done', RUI, 'tarefa_concluida', 'O Pedro concluiu o registo de ativos', '4 ativos técnicos registados. O inventário está completo.', '/org/componentes-agueda/ativos', 15, '09:42'),
    n('ntf-marta-submitted', MARTA, 'avaliacao', 'Componentes Águeda submeteu a avaliação', 'Reveja os resultados, registe os riscos e valide o roadmap.', '/clientes/componentes-agueda/visao-geral', 14, '10:12'),
    n('ntf-comment', RUI, 'comentario', 'A Marta comentou um ativo', '"PLC das linhas de montagem": confirme se os PLC têm acesso remoto do fornecedor.', '/org/componentes-agueda/ativos?ativo=ast-plc', 16, '14:30'),
  ]
  const c3 = snapshot === 'c3' ? [
    n('ntf-validated', RUI, 'roadmap', 'Roadmap e riscos validados', 'A Marta Ferreira validou o plano de ação. Já pode ver os riscos da empresa.', '/org/componentes-agueda/riscos', 16, '17:05'),
  ] : []
  return [...c3, ...c2, ...base]
}

export const SNAPSHOTS: Array<{ id: SnapshotId; label: string; hint: string }> = [
  { id: 'c0', label: 'Adesão · empresa por registar', hint: 'Rui cria a conta e regista a Componentes Águeda' },
  { id: 'c1', label: 'Cenário 1 · início', hint: 'Rui com 3 ativos; registo técnico por atribuir' },
  { id: 'c2', label: 'Cenário 2 · início', hint: 'Inventário completo; Marta a registar riscos' },
  { id: 'c3', label: 'Cenário 3 · roadmap validado', hint: 'Rui vê os riscos em só leitura' },
]
