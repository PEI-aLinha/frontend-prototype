import { describe, expect, it } from 'vitest'
import { pathThrough, progressPercent } from './roadmapMap'

type Status = 'por_iniciar' | 'em_curso' | 'concluida'
const statuses = (list: Status[]) => list.map((status) => ({ status }))

describe('pathThrough', () => {
  it('draws nothing for fewer than two circles', () => {
    expect(pathThrough([])).toBe('')
    expect(pathThrough([{ x: 10, y: 10 }])).toBe('')
  })

  it('leaves the first circle and lands on the last, one curve per stretch', () => {
    const d = pathThrough([{ x: 0, y: 4 }, { x: 10, y: 8 }, { x: 20, y: 4 }, { x: 30, y: 4 }])
    expect(d.startsWith('M 0 4 C')).toBe(true)
    expect(d.endsWith('30 4')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(3)
  })

  it('bends each stretch with its handles halfway across', () => {
    expect(pathThrough([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M 0 0 C 5 0, 5 10, 10 10')
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
