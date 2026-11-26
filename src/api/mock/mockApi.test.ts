import { beforeEach, describe, expect, it } from 'vitest'
import { createMockApi } from './mockApi'
import { resetDemo } from './store'
import { ORG_ID, PEDRO, RUI, MARTA, ASSET_TASK_ID } from './seed'

let who = RUI
const api = createMockApi(() => ({ userId: who }))

describe('mock API permissions', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c2')
  })

  it('shows the analyst only the assets of their task', async () => {
    who = PEDRO
    const assets = await api.assets.listAssets(ORG_ID)
    expect(assets).toHaveLength(4)
    expect(assets.every((a) => a.taskId === ASSET_TASK_ID)).toBe(true)
    who = RUI
    expect(await api.assets.listAssets(ORG_ID)).toHaveLength(7)
  })

  it('denies risks to the analyst and to the client before validation', async () => {
    who = PEDRO
    await expect(api.assets.listRisks(ORG_ID)).rejects.toMatchObject({ status: 403 })
    who = RUI
    await expect(api.assets.listRisks(ORG_ID)).rejects.toMatchObject({ status: 403 })
    who = MARTA
    await api.assessment.validateRoadmap(ORG_ID)
    who = RUI
    expect((await api.assets.listRisks(ORG_ID)).length).toBeGreaterThan(0)
  })

  it('refuses to validate the roadmap while the assessment is still being answered', async () => {
    resetDemo('c1')
    who = MARTA
    await expect(api.assessment.validateRoadmap(ORG_ID)).rejects.toMatchObject({ status: 422 })
  })

  it('lets only the consultant reopen a validated roadmap, with a reason, and hides the risks again', async () => {
    who = MARTA
    await api.assessment.validateRoadmap(ORG_ID)
    who = RUI
    await expect(api.assessment.reopenRoadmap(ORG_ID, 'Rever')).rejects.toMatchObject({ status: 403 })
    who = MARTA
    await expect(api.assessment.reopenRoadmap(ORG_ID, '  ')).rejects.toMatchObject({ status: 422 })
    expect(await api.assessment.reopenRoadmap(ORG_ID, 'Falta ligar um risco')).toMatchObject({ validated: false, validatedBy: null })
    expect((await api.audit.list(ORG_ID)).map((e) => e.summary)).toContain('Reabriu o roadmap: Falta ligar um risco')
    who = RUI
    await expect(api.assets.listRisks(ORG_ID)).rejects.toMatchObject({ status: 403 })
  })

  it('requires a linked action to mitigate and a justification to accept', async () => {
    who = MARTA
    const base = { assetId: 'ast-servidor', threat: 'Ransomware', description: '', ownerId: RUI, probability: 2, impact: 3 }
    await expect(api.assets.saveRisk(ORG_ID, { ...base, treatment: 'mitigar', actionIds: [] })).rejects.toMatchObject({ status: 422 })
    await expect(api.assets.saveRisk(ORG_ID, { ...base, treatment: 'aceitar', actionIds: [] })).rejects.toMatchObject({ status: 422 })
    const saved = await api.assets.saveRisk(ORG_ID, { ...base, treatment: 'mitigar', actionIds: ['act-mfa', 'act-teste-backups'] })
    expect(saved.status).toBe('em_tratamento')
    expect((await api.assets.listRiskLinks(ORG_ID)).filter((l) => l.riskId === saved.id)).toHaveLength(2)
  })

  it('writes an audit entry for every write', async () => {
    who = RUI
    const before = (await api.audit.list(ORG_ID)).length
    const a = await api.assets.saveAsset(ORG_ID, { name: 'Impressora', type: 'equipamento', criticalServiceId: null, ownerId: RUI, criticality: 'baixo' })
    const history = await api.audit.list(ORG_ID, { entityId: a.id })
    expect(history[0]).toMatchObject({ userId: RUI, action: 'create', summary: 'Registou o ativo "Impressora"' })
    expect((await api.audit.list(ORG_ID)).length).toBe(before + 1)
  })

  it('rejects a residual risk higher than the current risk', async () => {
    who = MARTA
    const base = { assetId: 'ast-servidor', threat: 'Ransomware', description: '', ownerId: RUI, probability: 2, impact: 3, treatment: null, actionIds: [] }
    await expect(api.assets.saveRisk(ORG_ID, { ...base, residualProbability: 3, residualImpact: 3 })).rejects.toMatchObject({ status: 422 })
    await expect(api.assets.saveRisk(ORG_ID, { ...base, residualProbability: 1 })).rejects.toMatchObject({ status: 422 })
    expect(await api.assets.saveRisk(ORG_ID, { ...base, residualProbability: 1, residualImpact: 3 })).toMatchObject({ residualProbability: 1 })
  })

  it('puts a removed asset back as it was, with its risks and dependants', async () => {
    resetDemo('c3')
    who = MARTA
    const linked = (await api.assets.listRisks(ORG_ID)).filter((r) => r.assetId === 'ast-servidor').map((r) => r.id)
    expect(linked.length).toBeGreaterThan(0)
    who = RUI
    const before = await api.assets.listAssets(ORG_ID)
    const dependants = before.filter((a) => a.dependsOn?.includes('ast-servidor')).map((a) => a.id)
    const removed = await api.assets.deleteAsset(ORG_ID, 'ast-servidor')
    expect(removed.riskIds.sort()).toEqual([...linked].sort())
    expect(removed.dependantIds.sort()).toEqual([...dependants].sort())
    const restored = await api.assets.restoreAsset(ORG_ID, removed)
    expect(restored.id).toBe('ast-servidor')
    const after = await api.assets.listAssets(ORG_ID)
    expect(after.filter((a) => a.dependsOn?.includes('ast-servidor')).map((a) => a.id).sort()).toEqual([...dependants].sort())
    who = MARTA
    expect((await api.assets.listRisks(ORG_ID)).filter((r) => r.assetId === 'ast-servidor').map((r) => r.id).sort()).toEqual([...linked].sort())
  })

  it('cancelling an integration request makes the system available to connect again', async () => {
    who = RUI
    const task = await api.integrations.assign(ORG_ID, 'backups', PEDRO)
    expect((await api.integrations.list(ORG_ID)).find((c) => c.provider.id === 'backups')?.status).toBe('pedido')
    await api.assets.updateTask(ORG_ID, task.id, { status: 'cancelada' })
    const after = (await api.integrations.list(ORG_ID)).find((c) => c.provider.id === 'backups')
    expect(after?.status).not.toBe('pedido')
    expect(after?.assignedTo ?? null).toBeNull()
  })

  it('denies consultants editing assets', async () => {
    who = MARTA
    await expect(api.assets.saveAsset(ORG_ID, { name: 'X', type: 'outro', criticalServiceId: null, ownerId: null, criticality: 'baixo' })).rejects.toMatchObject({ status: 403 })
  })
})
