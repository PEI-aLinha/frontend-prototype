import type { Asset } from '../../api/contracts'
import { ASSET_TYPE_LABEL, CRITICALITY_LABEL } from '../../config/labels'
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

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Simulated "PDF": opens a printable version to print/save as PDF. */
export function printList(orgName: string, services: string[][], rows: string[][]): void {
  const w = window.open('', '_blank', 'noopener=no')
  if (!w) return
  const table = (headers: string[], data: string[][]) =>
    `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${data.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  w.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Lista de Ativos — ${escapeHtml(orgName)}</title>
<style>body{font-family:'Nunito Sans',system-ui,sans-serif;color:#202124;margin:40px}h1{font-size:22px}h2{font-size:15px;margin-top:28px}p{color:#555a5f;font-size:13px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #d9dde0;padding:8px;text-align:left}th{background:#f7f7f8;font-family:monospace;text-transform:uppercase;font-size:10px;color:#646a6f}</style></head>
<body><h1>Lista de Ativos — ${escapeHtml(orgName)}</h1><p>Regulamento n.º 756/2026 · gerado pelo aLinha (protótipo). A submissão ao CNCS é feita fora da plataforma.</p>
<h2>Serviços críticos</h2>${table(SERVICE_HEADERS, services)}<h2>Ativos</h2>${table(HEADERS, rows)}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
}
