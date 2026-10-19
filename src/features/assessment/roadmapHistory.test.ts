import { describe, expect, it } from 'vitest'
import type { AuditEntry, User } from '../../api/contracts'
import { roadmapHistory } from './roadmapHistory'

const entry = (id: string, entityType: AuditEntry['entityType'], userId: string | null = 'usr-marta'): AuditEntry =>
  ({ id, organizationId: 'org', actorType: userId ? 'user' : 'system', userId, action: 'create', entityType, entityId: `ent-${id}`, summary: `Registo ${id}`, before: null, after: null, createdAt: '2026-10-16T17:05' })

const users = [{ id: 'usr-marta', name: 'Marta Ferreira', initials: 'MF', role: 'consultor', email: '', status: 'ativo', createdAt: '2026-10-01' }] as User[]

describe('roadmapHistory', () => {
  it('keeps only what explains the plan', () => {
    const result = roadmapHistory([
      entry('a', 'roadmap', null),
      entry('b', 'remediation_action'),
      entry('c', 'risk_action'),
      entry('d', 'risk'),
      entry('e', 'asset'),
      entry('f', 'comment'),
    ], users)
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('labels each entry with where it came from', () => {
    const result = roadmapHistory([entry('a', 'roadmap', null), entry('b', 'risk_action')], users)
    expect(result.map((i) => i.context)).toEqual(['Roadmap', 'Riscos ↔ roadmap'])
  })

  it('resolves the author, and leaves it null when there is nobody', () => {
    const result = roadmapHistory([entry('a', 'roadmap'), entry('b', 'roadmap', null), entry('c', 'roadmap', 'usr-desconhecido')], users)
    expect(result.map((i) => i.who?.name ?? null)).toEqual(['Marta Ferreira', null, null])
    expect(result[1].actorType).toBe('system')
  })

  it('is empty when the plan has not moved', () => {
    expect(roadmapHistory([entry('a', 'asset'), entry('b', 'task')], users)).toEqual([])
  })
})