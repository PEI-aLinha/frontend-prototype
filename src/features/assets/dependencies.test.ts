import { describe, expect, it } from 'vitest'
import type { Asset } from '../../api/contracts'
import { affectedBy } from './dependencies'

const a = (id: string, dependsOn: string[] = []) => ({ id, dependsOn }) as Asset

describe('affectedBy', () => {
  it('follows dependencies transitively and ignores cycles', () => {
    const assets = [a('rede'), a('nas', ['rede']), a('servidor', ['rede', 'nas']), a('plc', ['servidor']), a('x', ['y']), a('y', ['x'])]
    expect(affectedBy('rede', assets).map((x) => x.id).sort()).toEqual(['nas', 'plc', 'servidor'])
    expect(affectedBy('plc', assets)).toEqual([])
    expect(affectedBy('x', assets).map((x) => x.id)).toEqual(['y'])
  })
})
