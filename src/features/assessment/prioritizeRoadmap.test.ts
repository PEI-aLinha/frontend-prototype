import { describe, expect, it } from 'vitest'
import { prioritizeRoadmap } from './prioritizeRoadmap'

const actions = [
  { id: 'myciber', priority: 1 },
  { id: 'politica', priority: 2 },
  { id: 'formacao', priority: 3 },
  { id: 'mfa', priority: 4 },
  { id: 'teste-backups', priority: 5 },
  { id: 'ot', priority: 6 },
]

describe('prioritizeRoadmap', () => {
  it('keeps base order without risk signals', () => {
    const result = prioritizeRoadmap(actions, [])
    expect(result.map((r) => r.action.id)).toEqual(['myciber', 'politica', 'formacao', 'mfa', 'teste-backups', 'ot'])
    expect(result.every((r) => r.reason === null)).toBe(true)
  })

  it('moves actions linked to a high risk up and explains why', () => {
    const label = 'Ransomware no servidor de produção'
    const result = prioritizeRoadmap(actions, [
      { actionId: 'mfa', level: 'alto', riskLabel: label, plainLabel: 'Um vírus pode parar a produção' },
      { actionId: 'teste-backups', level: 'alto', riskLabel: label, plainLabel: 'As cópias podem não servir' },
    ])
    expect(result.map((r) => r.action.id).slice(0, 2)).toEqual(['mfa', 'teste-backups'])
    expect(result[0]).toMatchObject({ rank: 1, baseRank: 4, reason: `Prioridade aumentada pelo risco: ${label}` })
    expect(result.find((r) => r.action.id === 'myciber')?.reason).toBeNull()
  })

  it('uses the highest linked risk for an action and ranks high above medium', () => {
    const result = prioritizeRoadmap(actions, [
      { actionId: 'ot', level: 'medio', riskLabel: 'Paragem OT', plainLabel: 'A produção pode parar' },
      { actionId: 'formacao', level: 'baixo', riskLabel: 'Phishing', plainLabel: 'Um email falso pode enganar alguém' },
      { actionId: 'formacao', level: 'alto', riskLabel: 'Fuga de dados', plainLabel: 'Alguém pode ver dados pessoais' },
    ])
    expect(result.map((r) => r.action.id).slice(0, 2)).toEqual(['formacao', 'ot'])
    expect(result[0].topRisk?.riskLabel).toBe('Fuga de dados')
    expect(result[0].topRisk?.plainLabel).toBe('Alguém pode ver dados pessoais')
  })

  it('does not mutate the input', () => {
    const copy = actions.map((a) => ({ ...a }))
    prioritizeRoadmap(actions, [{ actionId: 'ot', level: 'alto', riskLabel: 'x', plainLabel: 'x' }])
    expect(actions).toEqual(copy)
  })
})
