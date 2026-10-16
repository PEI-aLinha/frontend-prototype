import { describe, expect, it } from 'vitest'
import type { CriticalService, User } from '../../../api/contracts'
import { CSV_TEMPLATE, parseAssetCsv, splitCsvLine } from './parseAssetCsv'

const services: CriticalService[] = [{ id: 'svc-producao', organizationId: 'o', name: 'Produção de componentes', ownerId: null, criticality: 'alto' }]
const users: User[] = [{ id: 'u-rui', name: 'Rui Santos', initials: 'RS', role: 'responsavel', title: '', email: '' }]
const ctx = { services, users, existingNames: ['ERP de gestão e faturação'] }

describe('splitCsvLine', () => {
  it('keeps separators inside quotes and unescapes double quotes', () => {
    expect(splitCsvLine('"Servidor; principal";Servidor;"diz ""olá"""', ';')).toEqual(['Servidor; principal', 'Servidor', 'diz "olá"'])
  })
})

describe('parseAssetCsv', () => {
  it('parses the template without errors', () => {
    const { rows, error } = parseAssetCsv(CSV_TEMPLATE, ctx)
    expect(error).toBeNull()
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(rows[1].input).toMatchObject({ type: 'aplicacao', criticality: 'medio', criticalServiceId: 'svc-producao', ownerId: 'u-rui' })
  })

  it('accepts comma separators, accent-insensitive headers and reports row errors', () => {
    const csv = 'nome,tipo,criticidade\nRouter 4G,Rede,Muito alta\n,Servidor,Alta\nPLC velho,PLC,alta'
    const { rows } = parseAssetCsv(csv, ctx)
    expect(rows[0].errors[0]).toMatch(/Criticidade desconhecida/)
    expect(rows[1].errors).toContain('Falta o nome do ativo.')
    expect(rows[2].input?.type).toBe('sistema_producao_ot')
    expect(rows[0].line).toBe(2)
  })

  it('warns about duplicates and unknown services or owners instead of failing', () => {
    const csv = 'Ativo;Tipo;Serviço crítico;Responsável;Criticidade\nERP de gestão e faturação;Aplicação;Logística;Ana;Alta'
    const [row] = parseAssetCsv(csv, ctx).rows
    expect(row.errors).toEqual([])
    expect(row.warnings).toHaveLength(3)
    expect(row.input).toMatchObject({ criticalServiceId: null, ownerId: null })
  })

  it('fails clearly without a name column', () => {
    expect(parseAssetCsv('Tipo;Criticidade\nServidor;Alta', ctx).error).toMatch(/coluna "Ativo"/)
  })
})
