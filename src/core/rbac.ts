import type { Role } from '../api/contracts'
import { FLAGS } from '../config/flags'

export type Resource = 'asset' | 'critical_service' | 'asset_task' | 'asset_comment' | 'risk' | 'roadmap' | 'history' | 'portfolio' | 'asset_export'
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'comment' | 'validate' | 'link'

export interface RbacContext {
  roadmapValidated?: boolean
}

type Rule = boolean | ((ctx: RbacContext) => boolean)
type Matrix = Partial<Record<Resource, Partial<Record<Action, Rule>>>>

const clientSeesRisks = (ctx: RbacContext) => FLAGS.RISKS_VISIBLE_TO_CLIENT_AFTER_VALIDATION && !!ctx.roadmapValidated

// RNF08: permissões por papel. O analista só vê os ativos da sua tarefa (filtro no fornecedor de dados).
const MATRIX: Record<Role, Matrix> = {
  responsavel: {
    asset: { view: true, create: true, edit: true, delete: true },
    critical_service: { view: true, create: true, edit: true, delete: true },
    asset_task: { view: true, assign: true },
    asset_comment: { view: true },
    asset_export: { view: true },
    risk: { view: clientSeesRisks },
    roadmap: { view: true },
    history: { view: true },
  },
  analista: {
    asset: { view: true, create: true, edit: true },
    critical_service: { view: true },
    asset_task: { view: true },
  },
  consultor: {
    asset: { view: true },
    critical_service: { view: true },
    asset_comment: { view: true, comment: true },
    asset_export: { view: true },
    risk: { view: true, create: true, edit: true, link: true },
    roadmap: { view: true, validate: true, create: true },
    history: { view: true },
    portfolio: { view: true },
  },
}

export function canRole(role: Role, action: Action, resource: Resource, ctx: RbacContext = {}): boolean {
  const rule = MATRIX[role][resource]?.[action]
  if (typeof rule === 'function') return rule(ctx)
  return rule === true
}
