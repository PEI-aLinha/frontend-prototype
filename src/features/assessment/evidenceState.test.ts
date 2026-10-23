import { describe, expect, it } from 'vitest'
import type { CollectedEvidence } from '../../api/contracts'
import { evidenceState } from './evidenceState'

const ev = (id: string, ok: boolean, result: string): CollectedEvidence =>
  ({ id, provider: 'microsoft365', title: `Evidência ${id}`, result, ok, strength: 'continuamente_verificada', remediationActionId: 'act-mfa', collectedAt: '2026-10-16T17:30' })

describe('evidenceState', () => {
  it('has nothing to say without collected evidence', () => {
    expect(evidenceState([])).toBeNull()
  })

  it('is comprovada when the check passed', () => {
    expect(evidenceState([ev('e1', true, '30 de 30 cópias com sucesso')])).toEqual({ tone: 'brand', label: 'Estado: comprovada', detail: '30 de 30 cópias com sucesso' })
  })

  it('is não comprovada when the check failed', () => {
    expect(evidenceState([ev('e1', false, '2 administradores sem MFA')])).toEqual({ tone: 'risk', label: 'Estado: não comprovada', detail: '2 administradores sem MFA' })
  })

  it('takes the worst of several checks for the same action', () => {
    expect(evidenceState([ev('ok', true, '21 de 23 portáteis'), ev('ko', false, 'Rede OT no mesmo segmento')]))
      .toEqual({ tone: 'risk', label: 'Estado: não comprovada', detail: 'Rede OT no mesmo segmento' })
  })
})