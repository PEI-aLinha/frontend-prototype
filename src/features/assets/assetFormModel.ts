import { z } from 'zod'
import type { Asset, AssetInput, AssetType, Level } from '../../api/contracts'

export const NONE = 'nenhum'

const schema = z.object({
  name: z.string().trim().min(2, 'Indique o nome do ativo (pelo menos 2 letras).').max(120, 'O nome é demasiado longo.'),
  type: z.string().min(1, 'Escolha o tipo de ativo.'),
  ownerId: z.string().min(1, 'Escolha quem é responsável.'),
})

export interface AssetFormValues {
  name: string
  type: AssetType | ''
  location: string
  service: string
  ownerId: string
  criticality: Level
  dependsOn: string[]
}

export function emptyValues(defaults: Partial<AssetFormValues> = {}): AssetFormValues {
  return { name: '', type: '', location: '', service: NONE, ownerId: '', criticality: 'alto', dependsOn: [], ...defaults }
}

export function valuesFromAsset(a: Asset): AssetFormValues {
  return { name: a.name, type: a.type, location: a.location ?? '', service: a.criticalServiceId ?? NONE, ownerId: a.ownerId ?? '', criticality: a.criticality, dependsOn: a.dependsOn ?? [] }
}

export function toInput(v: AssetFormValues, taskId?: string): AssetInput {
  return {
    name: v.name.trim(),
    type: v.type as AssetType,
    location: v.location.trim() || undefined,
    criticalServiceId: v.service === NONE ? null : v.service,
    ownerId: v.ownerId || null,
    criticality: v.criticality,
    dependsOn: v.dependsOn,
    taskId,
  }
}

export type Errors = Partial<Record<'name' | 'type' | 'ownerId', string>>

export function validateAsset(v: AssetFormValues): Errors {
  const r = schema.safeParse(v)
  if (r.success) return {}
  const out: Errors = {}
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof Errors
    out[k] ??= issue.message
  }
  return out
}

