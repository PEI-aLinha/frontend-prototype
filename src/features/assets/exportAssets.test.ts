import { describe, expect, it } from 'vitest'
import type { Asset, CriticalService, User } from '../../api/contracts'
import { serviceRows, toListCsv } from './exportAssets'
import type { Inventory } from './useInventory'

const rui = { id: 'u-rui', name: 'Rui Santos' } as User
const services = [
  { id: 'svc-a', name: 'Produção de componentes', ownerId: 'u-rui', criticality: 'alto' },
  { id: 'svc-b', name: 'Faturação e expedição', ownerId: null, criticality: 'medio' },
] as CriticalService[]
const assets = [{ id: 'a1', criticalServiceId: 'svc-a' }, { id: 'a2', criticalServiceId: 'svc-a' }] as Asset[]
const inv = { services, assets, user: (id: string | null) => (id === rui.id ? rui : undefined) } as Inventory

describe('serviceRows', () => {
  it('lists each critical service with owner, criticality and asset count', () => {
    expect(serviceRows(inv)).toEqual([
      ['Produção de componentes', 'Rui Santos', 'Alta', '2'],
      ['Faturação e expedição', '', 'Média', '0'],
    ])
  })
})

describe('toListCsv', () => {
  it('writes the services section before the assets section', () => {
    const csv = toListCsv([['S', 'R', 'Alta', '1']], [['A', 'Servidor', 'S', '', 'R', 'Alta']]).split('\r\n')
    expect(csv[0]).toContain('"Serviço crítico";"Responsável"')
    expect(csv[2]).toBe('')
    expect(csv[3]).toContain('"Ativo";"Tipo"')
  })
})
