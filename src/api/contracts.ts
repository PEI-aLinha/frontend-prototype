// Contratos entre a interface e os dados. Uma interface por plugin (AssetsApi, AssessmentApi, AuditApi).
// A implementação mock vive em src/api/mock; a real (core Kotlin/Spring Modulith) só tem de cumprir estes tipos.
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

export interface Organization {
  id: Id
  slug: string
  name: string
  description: string
  classification: string
  frameworks: string[]
  consultantId: Id
}

export type ActorType = 'user' | 'system' | 'ai'

export interface AuditEntry {
  id: Id
  organizationId: Id
  actorType: ActorType
  userId: Id | null
  action: string
  entityType: 'asset' | 'critical_service' | 'risk' | 'risk_action' | 'task' | 'remediation_action' | 'roadmap' | 'comment'
  entityId: Id
  summary: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: IsoDate
}

// ---------------- assets (plugin Riscos e Ativos) ----------------
// D1: armazenamento e sistema_producao_ot ainda não existem no enum do DBML.
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

/** Valor especial de "serviço crítico" quando o ativo suporta todos os serviços. */
export const ALL_SERVICES = 'todos'

export interface Asset {
  id: Id
  organizationId: Id
  criticalServiceId: Id | typeof ALL_SERVICES | null
  name: string
  type: AssetType
  ownerId: Id | null
  criticality: Level
  /** D4: não existe no DBML. */
  location?: string
  /** Tarefa de registo que originou o ativo (quando registado por um analista). */
  taskId?: Id
  createdBy: Id
  createdAt: IsoDate
  updatedAt: IsoDate
}

export type AssetInput = Pick<Asset, 'name' | 'type' | 'criticalServiceId' | 'ownerId' | 'criticality' | 'location' | 'taskId'>

export type TaskStatus = 'pendente' | 'concluida'

export interface Task {
  id: Id
  organizationId: Id
  kind: 'ativos' | 'pergunta'
  title: string
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
export type RiskStatus = 'por_tratar' | 'em_tratamento' | 'tratado' | 'aceite'

export interface Risk {
  id: Id
  organizationId: Id
  assetId: Id | null
  threat: string
  description: string
  ownerId: Id | null
  probability: number
  impact: number
  // risk_level é derivado (computeRiskLevel) e não é guardado.
  treatment: Treatment | null
  acceptanceJustification?: string
  residualProbability?: number
  residualImpact?: number
  status: RiskStatus
  plainLanguage?: string
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
  actionIds: Id[]
}

/** assets.risk_action — liga um risco a uma ação do roadmap só por ID (sem FK entre plugins). */
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
  listTasks(org: Id): Promise<Task[]>
  assignTask(org: Id, input: TaskInput): Promise<Task>
  completeTask(org: Id, id: Id): Promise<Task>
  listRisks(org: Id): Promise<Risk[]>
  getRisk(org: Id, id: Id): Promise<Risk>
  saveRisk(org: Id, input: RiskInput, id?: Id): Promise<Risk>
  listRiskLinks(org: Id): Promise<RiskActionLink[]>
  listComments(org: Id, assetId: Id): Promise<AssetComment[]>
  addComment(org: Id, assetId: Id, body: string): Promise<AssetComment>
}

// ---------------- assessment (plugin Avaliação; só o mínimo do roadmap) ----------------
export type ActionStatus = 'por_iniciar' | 'em_curso' | 'concluida'

export interface RemediationAction {
  id: Id
  organizationId: Id
  findingId: Id
  description: string
  /** 1 = mais urgente. Prioridade de base (proposta pela IA ou pela consultora). */
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
}

export interface AssessmentApi {
  listActions(org: Id): Promise<RemediationAction[]>
  proposeAction(org: Id, input: ProposeActionInput): Promise<RemediationAction>
  getRoadmapStatus(org: Id): Promise<RoadmapStatus>
  validateRoadmap(org: Id): Promise<RoadmapStatus>
  listPortfolio(): Promise<PortfolioClient[]>
}

// ---------------- core: auditoria, diretório ----------------
export interface AuditApi {
  list(org: Id, filter?: { entityId?: Id; entityType?: AuditEntry['entityType'] }): Promise<AuditEntry[]>
}

export interface DirectoryApi {
  getOrganization(slug: string): Promise<Organization>
  listUsers(org: Id): Promise<User[]>
}

export interface Api {
  assets: AssetsApi
  assessment: AssessmentApi
  audit: AuditApi
  directory: DirectoryApi
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

/** Identidade de quem faz o pedido (na API real vem do token de sessão). */
export interface DemoActor {
  userId: Id
}
