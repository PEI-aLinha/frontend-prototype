import { describe, expect, it } from 'vitest'
import { progressPercent, serpentinePath } from './roadmapMap'

type Status = 'por_iniciar' | 'em_curso' | 'concluida'
const statuses = (list: Status[]) => list.map((status) => ({ status }))

describe('serpentinePath', () => {
  it('draws nothing for fewer than two circles', () => {
    expect(serpentinePath(0)).toBe('')
    expect(serpentinePath(1)).toBe('')
  })

  it('leaves and lands on the middle, with one curve per stretch', () => {
    const d = serpentinePath(7)
    expect(d.startsWith('M 50 24 C')).toBe(true)
    expect(d.endsWith('650 24')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(6)
  })
})

describe('progressPercent', () => {
  it('is zero until an action starts', () => {
    expect(progressPercent([])).toBe(0)
    expect(progressPercent(statuses(['por_iniciar', 'por_iniciar']))).toBe(0)
  })

  it('reaches half a stretch past the last action started', () => {
    expect(progressPercent(statuses(['em_curso', 'em_curso', 'por_iniciar', 'por_iniciar', 'por_iniciar', 'por_iniciar', 'por_iniciar']))).toBe(25)
    expect(progressPercent(statuses(['concluida', 'por_iniciar']))).toBe(50)
  })

  it('stops at the end when every action is done', () => {
    expect(progressPercent(statuses(Array(7).fill('concluida')))).toBe(100)
  })
})
