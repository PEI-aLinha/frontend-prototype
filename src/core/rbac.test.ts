import { describe, expect, it } from 'vitest'
import { canRole } from './rbac'

describe('canRole', () => {
  it('lets the designated manager manage assets and assign registration', () => {
    expect(canRole('responsavel', 'create', 'asset')).toBe(true)
    expect(canRole('responsavel', 'assign', 'asset_task')).toBe(true)
  })

  it('keeps the designated manager read-only on risks, and only after validation (D3)', () => {
    expect(canRole('responsavel', 'view', 'risk', { roadmapValidated: false })).toBe(false)
    expect(canRole('responsavel', 'view', 'risk', { roadmapValidated: true })).toBe(true)
    expect(canRole('responsavel', 'edit', 'risk', { roadmapValidated: true })).toBe(false)
  })

  it('gives the analyst no access to risks, roadmap, history or assignment', () => {
    expect(canRole('analista', 'view', 'risk', { roadmapValidated: true })).toBe(false)
    expect(canRole('analista', 'view', 'roadmap')).toBe(false)
    expect(canRole('analista', 'view', 'history')).toBe(false)
    expect(canRole('analista', 'assign', 'asset_task')).toBe(false)
    expect(canRole('analista', 'delete', 'asset')).toBe(false)
  })

  it('lets the consultant manage risks and validate the roadmap but not edit assets', () => {
    expect(canRole('consultor', 'create', 'risk')).toBe(true)
    expect(canRole('consultor', 'link', 'risk')).toBe(true)
    expect(canRole('consultor', 'validate', 'roadmap')).toBe(true)
    expect(canRole('consultor', 'comment', 'asset_comment')).toBe(true)
    expect(canRole('consultor', 'edit', 'asset')).toBe(false)
  })
})
