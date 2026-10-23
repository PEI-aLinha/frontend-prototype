import type { Asset } from '../../api/contracts'
import { ASSET_TYPE_LABEL, CRITICALITY_LABEL } from '../../config/labels'
import { printDocument } from '../../ui/printDocument'
import type { Inventory } from './useInventory'

const HEADERS = ['Ativo', 'Tipo', 'Serviço crítico', 'Localização', 'Responsável', 'Criticidade']
const SERVICE_HEADERS = ['Serviço crítico', 'Responsável', 'Criticidade', 'N.º de ativos']

export function assetRows(assets: Asset[], inv: Inventory): string[][] {
  return assets.map((a) => [a.name, ASSET_TYPE_LABEL[a.type], inv.serviceName(a.criticalServiceId), a.location ?? '', inv.user(a.ownerId)?.name ?? '', CRITICALITY_LABEL[a.criticality]])
}

/** RF35: the list covers critical services as well as assets. */
export function serviceRows(inv: Inventory): string[][] {
  return inv.services.map((s) => [s.name, inv.user(s.ownerId)?.name ?? '', s.criticality ? CRITICALITY_LABEL[s.criticality] : '', String(inv.assets.filter((a) => a.criticalServiceId === s.id).length)])
}

function csvCell(v: string): string {
  // Prevents spreadsheet formula injection and escapes quotes.
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v
  return `"${safe.replace(/"/g, '""')}"`
}

export function toCsvWith(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

export function toCsv(rows: string[][]): string {
  return toCsvWith(HEADERS, rows)
}

/** Two sections (critical services, then assets) separated by a blank line. */
export function toListCsv(services: string[][], assets: string[][]): string {
  return [toCsvWith(SERVICE_HEADERS, services), '', toCsv(assets)].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Simulated "PDF": opens a printable version to print/save as PDF. */
export function printList(orgName: string, services: string[][], rows: string[][]): void {
  printDocument({
    title: `Lista de Ativos — ${orgName}`,
    intro: 'Regulamento n.º 756/2026 · gerado pelo aLinha (protótipo). A submissão ao CNCS é feita fora da plataforma.',
    sections: [
      { title: 'Serviços críticos', headers: SERVICE_HEADERS, rows: services },
      { title: 'Ativos', headers: HEADERS, rows },
    ],
  })
}
