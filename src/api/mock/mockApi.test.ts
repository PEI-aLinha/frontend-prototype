import { beforeEach, describe, expect, it } from 'vitest'
import { createMockApi } from './mockApi'
import { getState, resetDemo, setState } from './store'
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

  it('denies consultants editing assets', async () => {
    who = MARTA
    await expect(api.assets.saveAsset(ORG_ID, { name: 'X', type: 'outro', criticalServiceId: null, ownerId: null, criticality: 'baixo' })).rejects.toMatchObject({ status: 403 })
  })

  describe('organisation isolation', () => {
    const OTHER = 'org-outra'
    const foreign = () => {
      setState((st) => ({
        ...st,
        organizations: [...st.organizations, { ...st.organizations[0], id: OTHER, slug: OTHER }],
        services: [...st.services, { ...st.services[0], id: 'svc-x', organizationId: OTHER }],
        assets: [...st.assets, { ...st.assets[0], id: 'ast-x', organizationId: OTHER }],
      }))
    }

    it('rejects writes on resources of another organisation', async () => {
      who = RUI
      foreign()
      await expect(api.assets.saveService(ORG_ID, { name: 'S', ownerId: RUI, criticality: 'alto' }, 'svc-x')).rejects.toMatchObject({ status: 404 })
      await expect(api.assets.deleteService(ORG_ID, 'svc-x')).rejects.toMatchObject({ status: 404 })
      await expect(api.assets.deleteAsset(ORG_ID, 'ast-x')).rejects.toMatchObject({ status: 404 })
      await expect(api.assets.saveAsset(ORG_ID, { name: 'X', type: 'outro', criticalServiceId: null, ownerId: null, criticality: 'baixo' }, 'ast-x')).rejects.toMatchObject({ status: 404 })
      await api.assets.bulkDeleteAssets(ORG_ID, ['ast-x'])
      expect(getState().assets.some((a) => a.id === 'ast-x')).toBe(true)
    })

    it('lists only the users of the organisation plus consultancy staff', async () => {
      setState((st) => ({ ...st, users: [...st.users, { ...st.users[0], id: 'u-x', organizationId: OTHER }] }))
      const ids = (await api.directory.listUsers(ORG_ID)).map((u) => u.id)
      expect(ids).toContain(MARTA)
      expect(ids).not.toContain('u-x')
    })
  })
})
