// Contracts between the UI and the data. One interface per plugin (AssetsApi, AssessmentApi, AuditApi).
// The mock implementation lives in src/api/mock; the real one (Kotlin/Spring Modulith core) only has to satisfy these types.
import type { Level } from '../config/riskMatrix'

export type { Level }
export type Id = string
export type IsoDate = string

// ---------------- core ----------------
export type Role = 'responsavel' | 'analista' | 'consultor'

export interface User {
  id: Id
  name: string
  initials: string
  role: Role
  title: string
  email: string
}

export type MemberStatus = 'ativo' | 'convite_pendente'

/** A person with access to an organization, or invited to it (US12, RF05). */
export interface TeamMember {
  id: Id
  organizationId: Id
  /** Set once the invitation is accepted. */
  userId: Id | null
  name: string
  email: string
  role: Exclude<Role, 'consultor'>
  status: MemberStatus
  invitedAt: IsoDate | null
  invitedBy: Id | null
  joinedAt: IsoDate | null
}

/** aLinha consultant as seen by the client (RF04, RF34: emergency contact). */
export interface Consultant {
  id: Id
  name: string
  initials: string
  /** As each consultant chose to be presented, e.g. "A sua consultora". */
  heading: string
  email: string
  /** Emergency contact, also used when the platform is unavailable. */
  phone: string
}

/** Data needed for the framing under the Regime Jurídico da Cibersegurança (RF01). */
export interface OrganizationProfile {
  nif: string
  cae: string
  sector: string
  subsector: string | null
  services: string
  employees: number
  /** Annual turnover in euros. */
  turnover: number
  address: { street: string; postalCode: string; city: string }
  contacts: { phone: string; email: string }
  /** Permanent point of contact communicated to the CNCS. */
  permanentContact: { name: string; phone: string }
}

/** How the company uses AI systems (AI Act): chatbots, recruitment software, everyday assistants. */
export type AiUse = 'chatbot' | 'recrutamento' | 'assistente' | 'outro'

/** Answers to the regulatory scope questions (US34, RF03). */
export interface ScopeAnswers {
  employeeData: 'sim' | 'nao'
  customerData: 'sim' | 'nao' | 'so_empresas'
  usesAi: 'sim' | 'nao' | 'nao_sei'
  aiUses: AiUse[]
  answeredBy: Id
  answeredAt: IsoDate
}

export type ScopeInput = Omit<ScopeAnswers, 'answeredBy' | 'answeredAt'>

/** Official NIS2 qualification from the CNCS "Ato de Qualificação" (US11, RF02). Replaces the suggestion. */
export interface OfficialQualification {
  classification: 'essencial' | 'importante'
  /** Date of the Ato de Qualificação. */
  date: IsoDate
  /** Simulated attachment: only the file name and size are kept in the prototype. */
  document: { name: string; size: number }
  registeredBy: Id
  registeredAt: IsoDate
}

export type QualificationInput = Pick<OfficialQualification, 'classification' | 'date' | 'document'>

export interface Organization {
  id: Id
  slug: string
  name: string
  description: string
  classification: string
  frameworks: string[]
  /** Null until a consultant is assigned. */
  consultantId: Id | null
  /** Set by the automatic assignment (RF04). */
  consultantAssignedAt?: IsoDate
  profile?: OrganizationProfile
  registeredBy?: Id
  registeredAt?: IsoDate
  /** Undefined until the designated manager answers the scope questions. */
  scope?: ScopeAnswers
  officialQualification?: OfficialQualification
}

export type ActorType = 'user' | 'system' | 'ai'

export interface AuditEntry {
  id: Id
  organizationId: Id
  actorType: ActorType
  userId: Id | null
  action: string
  entityType: 'organization' | 'asset' | 'critical_service' | 'risk' | 'risk_action' | 'task' | 'remediation_action' | 'roadmap' | 'comment' | 'integration'
  entityId: Id
  summary: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: IsoDate
}

// ---------------- assets (Risks and Assets plugin) ----------------
// D1: armazenamento and sistema_producao_ot do not exist in the DBML enum yet.
export type AssetType =
  | 'servidor' | 'rede' | 'aplicacao' | 'base_dados' | 'equipamento' | 'servico_cloud'
  | 'armazenamento' | 'sistema_producao_ot' | 'outro'

export interface CriticalService {
  id: Id
  organizationId: Id
  name: string
  ownerId: Id | null
  criticality: Level
}

/** Special "critical service" value when the asset supports all services. */
export const ALL_SERVICES = 'todos'

export interface Asset {
  id: Id
  organizationId: Id
  criticalServiceId: Id | typeof ALL_SERVICES | null
  name: string
  type: AssetType
  ownerId: Id | null
  criticality: Level
  /** D4: does not exist in the DBML. */
  location?: string
  /** Other assets this one depends on to work (e.g. the ERP depends on the network). */
  dependsOn?: Id[]
  /** Record origin: manual, file import or integration. */
  source?: 'manual' | 'importacao' | 'integracao'
  /** Registration task that created the asset (when registered by an analyst). */
  taskId?: Id
  createdBy: Id
  createdAt: IsoDate
  updatedAt: IsoDate
}

export type AssetInput = Pick<Asset, 'name' | 'type' | 'criticalServiceId' | 'ownerId' | 'criticality' | 'location' | 'taskId' | 'dependsOn' | 'source'>

export type AssetBulkChange = Partial<Pick<Asset, 'criticality' | 'ownerId' | 'criticalServiceId'>>

export type TaskStatus = 'pendente' | 'concluida' | 'cancelada'

export interface Task {
  id: Id
  organizationId: Id
  kind: 'ativos' | 'pergunta' | 'integracao'
  /** Technical question: the analyst's answer. */
  answer?: QuestionAnswer
  /** Technical question: AI-pregenerated help (D10), informational only. */
  aiHelp?: string
  /** For integration tasks: which system to connect. */
  provider?: ProviderId
  title: string
  /** What to register (e.g. "Servidores, rede e sistemas de produção"). */
  scope?: string
  context: string
  assigneeId: Id
  assignedBy: Id
  dueDate: IsoDate
  status: TaskStatus
  expectedCount?: number
  createdAt: IsoDate
}

export interface TaskInput {
  assigneeId: Id
  title: string
  dueDate: IsoDate
}

export type Treatment = 'mitigar' | 'aceitar' | 'evitar' | 'partilhar'
export type RiskStatus = 'por_tratar' | 'em_tratamento' | 'tratado' | 'aceite' | 'arquivado'

export interface Risk {
  id: Id
  organizationId: Id
  assetId: Id | null
  threat: string
  description: string
  ownerId: Id | null
  probability: number
  impact: number
  // risk_level is derived (computeRiskLevel) and not stored.
  treatment: Treatment | null
  acceptanceJustification?: string
  residualProbability?: number
  residualImpact?: number
  status: RiskStatus
  plainLanguage?: string
  /** Next risk review (ISO/IEC 27005 requires periodic review). */
  reviewDate?: IsoDate
  /** Reason, when archived (the risk no longer exists or was a duplicate). */
  archivedReason?: string
  createdBy: Id
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface RiskInput {
  assetId: Id | null
  threat: string
  description: string
  ownerId: Id | null
  probability: number
  impact: number
  treatment: Treatment | null
  acceptanceJustification?: string
  residualProbability?: number
  residualImpact?: number
  plainLanguage?: string
  reviewDate?: IsoDate
  actionIds: Id[]
}

export type RiskStatusChange = { status: 'tratado' } | { status: 'arquivado'; reason: string } | { status: 'reaberto' }

/** assets.risk_action — links a risk to a roadmap action by ID only (no FK across plugins). */
export interface RiskActionLink {
  id: Id
  riskId: Id
  remediationActionId: Id
}

export interface AssetComment {
  id: Id
  assetId: Id
  authorId: Id
  body: string
  createdAt: IsoDate
}

export interface AssetFilter {
  search?: string
  type?: AssetType
  criticalServiceId?: Id
  criticality?: Level
  ownerId?: Id
}

export interface AssetsApi {
  listServices(org: Id): Promise<CriticalService[]>
  saveService(org: Id, input: Omit<CriticalService, 'id' | 'organizationId'>, id?: Id): Promise<CriticalService>
  deleteService(org: Id, id: Id): Promise<void>
  listAssets(org: Id): Promise<Asset[]>
  getAsset(org: Id, id: Id): Promise<Asset>
  saveAsset(org: Id, input: AssetInput, id?: Id): Promise<Asset>
  deleteAsset(org: Id, id: Id): Promise<void>
  importAssets(org: Id, inputs: AssetInput[]): Promise<Asset[]>
  bulkUpdateAssets(org: Id, ids: Id[], change: AssetBulkChange): Promise<void>
  bulkDeleteAssets(org: Id, ids: Id[]): Promise<void>
  listTasks(org: Id): Promise<Task[]>
  assignTask(org: Id, input: TaskInput): Promise<Task>
  completeTask(org: Id, id: Id): Promise<Task>
  listRisks(org: Id): Promise<Risk[]>
  getRisk(org: Id, id: Id): Promise<Risk>
  saveRisk(org: Id, input: RiskInput, id?: Id): Promise<Risk>
  setRiskStatus(org: Id, id: Id, change: RiskStatusChange): Promise<Risk>
  listRiskLinks(org: Id): Promise<RiskActionLink[]>
  updateTask(org: Id, id: Id, change: { dueDate?: IsoDate; status?: 'cancelada' }): Promise<Task>
  remindTask(org: Id, id: Id): Promise<void>
  listComments(org: Id, assetId: Id): Promise<AssetComment[]>
  addComment(org: Id, assetId: Id, body: string): Promise<AssetComment>
}

// ---------------- assessment (Assessment plugin; roadmap minimum only) ----------------
export type ActionStatus = 'por_iniciar' | 'em_curso' | 'concluida'

export interface RemediationAction {
  id: Id
  organizationId: Id
  findingId: Id
  description: string
  /** 1 = most urgent. Base priority (proposed by the AI or the consultant). */
  priority: number
  dueDate: IsoDate | null
  assignedTo: Id | null
  requiredEvidence: string
  status: ActionStatus
  aiOutputId: Id | null
  legalObligation: string
  /** Origem: lacuna e controlo. */
  findingTitle: string
  controlCode: string
  proposedBy: Id | null
}

export interface RoadmapStatus {
  validated: boolean
  validatedAt: IsoDate | null
  validatedBy: Id | null
  assessmentCompletedAt: IsoDate | null
}

export interface ProposeActionInput {
  description: string
  legalObligation: string
  requiredEvidence: string
  dueDate: IsoDate | null
}

export interface PortfolioClient {
  organization: Organization
  sector: string
  employees: number
  stage: string
  stageTone: 'signal' | 'neutral' | 'dark'
  nextStep: string
  updatedAt: IsoDate
  /** Assigned automatically after a new registration (US01). */
  isNew?: boolean
}

export type AnswerChoice = 'sim' | 'parcial' | 'nao' | 'nao_sei'
export interface QuestionAnswer { choice: AnswerChoice; note?: string }

export interface AssessmentSection {
  id: Id
  name: string
  answered: number
  total: number
  /** Questions in this section delegated to an analyst. */
  delegated: Array<{ taskId: Id; assigneeId: Id; status: Task['status'] }>
}

export interface AssessmentSummary {
  status: 'em_curso' | 'submetida' | 'validada'
  sections: AssessmentSection[]
  /** Maturity level (1–5), only after validation. */
  maturity: number | null
}

export interface AssessmentApi {
  getAssessment(org: Id): Promise<AssessmentSummary>
  answerQuestion(org: Id, taskId: Id, answer: QuestionAnswer): Promise<Task>
  listActions(org: Id): Promise<RemediationAction[]>
  proposeAction(org: Id, input: ProposeActionInput): Promise<RemediationAction>
  getRoadmapStatus(org: Id): Promise<RoadmapStatus>
  validateRoadmap(org: Id): Promise<RoadmapStatus>
  listPortfolio(): Promise<PortfolioClient[]>
}

// ---------------- organization (Organization plugin) ----------------
export interface RegistrationInput {
  account: { name: string; email: string }
  organization: { name: string } & OrganizationProfile
}

export interface OrganizationApi {
  /** False when an account already uses this email (checked before the account is created). */
  isEmailAvailable(email: string): Promise<boolean>
  /** Creates the designated manager's account and the organization, associated with each other (US10). */
  register(input: RegistrationInput): Promise<Organization>
  /** Saves the answers about personal data and AI (US34). Designated manager only. */
  saveScope(org: Id, input: ScopeInput): Promise<Organization>
  /** Registers the official qualification given by the CNCS (US11). Designated manager only. */
  registerQualification(org: Id, input: QualificationInput): Promise<Organization>
  /** The consultant assigned to the organization, or null while none is assigned. */
  getConsultant(org: Id): Promise<Consultant | null>
  /** Members and pending invitations of the organization (US12). */
  listMembers(org: Id): Promise<TeamMember[]>
}

// ---------------- core: audit, directory ----------------
export interface AuditApi {
  list(org: Id, filter?: { entityId?: Id; entityType?: AuditEntry['entityType'] }): Promise<AuditEntry[]>
}

export interface DirectoryApi {
  getOrganization(slug: string): Promise<Organization>
  listUsers(org: Id): Promise<User[]>
  /** Demo "today" (each scenario takes place on one day). */
  getToday(): Promise<IsoDate>
}

export type NotificationKind = 'tarefa' | 'tarefa_concluida' | 'lembrete' | 'prazo' | 'comentario' | 'roadmap' | 'avaliacao' | 'integracao' | 'risco'

export interface AppNotification {
  id: Id
  organizationId: Id
  userId: Id
  kind: NotificationKind
  title: string
  body: string
  link: string | null
  channels: Array<'app' | 'email'>
  read: boolean
  createdAt: IsoDate
}

export interface NotificationsApi {
  list(): Promise<AppNotification[]>
  markRead(id: Id): Promise<void>
  markAllRead(): Promise<void>
}

export interface Api {
  organization: OrganizationApi
  assets: AssetsApi
  assessment: AssessmentApi
  audit: AuditApi
  directory: DirectoryApi
  notifications: NotificationsApi
  integrations: IntegrationsApi
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

/** Identity of the requester (in the real API it comes from the session token). */
export interface DemoActor {
  userId: Id
}

// ---------------- integrations (Provider plugins, RF37 / US37) ----------------
export type ProviderId = 'microsoft365' | 'intune' | 'firewall' | 'backups' | 'google' | 'aws'
export type ConnectionStatus = 'disponivel' | 'pedido' | 'ligado' | 'erro'

export interface ProviderInfo {
  id: ProviderId
  name: string
  category: string
  description: string
  /** What the integration reads (always read-only). */
  reads: string[]
  /** What it brings into aLinha. */
  brings: string[]
  /** Whether it does not apply to this company (e.g. does not use AWS). */
  applies: boolean
}

export interface IntegrationConnection {
  provider: ProviderInfo
  status: ConnectionStatus
  connectedBy: Id | null
  connectedAt: IsoDate | null
  lastSyncAt: IsoDate | null
  /** Reference to the secret in the vault (OpenBao); the credential never reaches the browser. */
  secretRef: string | null
  assignedTo: Id | null
  errorMessage?: string
}

export type DiscoveryStatus = 'proposto' | 'aceite' | 'associado' | 'ignorado'

export interface DiscoveredAsset {
  id: Id
  provider: ProviderId
  name: string
  type: AssetType
  details: string
  suggestedServiceId: Id | typeof ALL_SERVICES | null
  suggestedCriticality: Level
  /** Inventory asset that looks like the same one. */
  possibleMatchId: Id | null
  status: DiscoveryStatus
  resolvedAssetId: Id | null
}

export type EvidenceStrength = 'autodeclarada' | 'documento_verificado' | 'tecnicamente_verificada' | 'continuamente_verificada'

export interface CollectedEvidence {
  id: Id
  provider: ProviderId
  title: string
  result: string
  ok: boolean
  strength: EvidenceStrength
  remediationActionId: Id | null
  collectedAt: IsoDate
}

export type DiscoveryDecision =
  | { decision: 'aceitar'; criticality: Level; criticalServiceId: Id | typeof ALL_SERVICES | null }
  | { decision: 'associar'; assetId: Id }
  | { decision: 'ignorar' }

export interface IntegrationsApi {
  list(org: Id): Promise<IntegrationConnection[]>
  connect(org: Id, provider: ProviderId): Promise<IntegrationConnection>
  sync(org: Id, provider: ProviderId): Promise<IntegrationConnection>
  disconnect(org: Id, provider: ProviderId): Promise<void>
  assign(org: Id, provider: ProviderId, userId: Id): Promise<Task>
  listDiscoveries(org: Id): Promise<DiscoveredAsset[]>
  decide(org: Id, id: Id, decision: DiscoveryDecision): Promise<DiscoveredAsset>
  listEvidence(org: Id): Promise<CollectedEvidence[]>
}
