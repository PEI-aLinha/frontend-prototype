import { useState, type ReactNode } from 'react'
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from './cn'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    width?: number
    align?: 'right'
  }
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  rowLabel?: (row: T) => string
  /** Versão em cartões para o mobile. */
  renderCard?: (row: T) => ReactNode
  footer?: ReactNode
  empty?: ReactNode
  initialSorting?: SortingState
  caption: string
  highlightId?: string | null
  /** Seleção de linhas (ações em massa). */
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
}

/** Tabela: cartão raio 16, cabeçalho paper-soft com eyebrows 11, linhas 14/20 com separador line-soft. */
const boxCls = 'size-4 cursor-pointer rounded accent-[var(--color-brand)]'

export function DataTable<T>({ data, columns, getRowId, onRowClick, rowLabel, renderCard, footer, empty, initialSorting = [], caption, highlightId, selected, onSelectedChange }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getRowId, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() })
  const rows = table.getRowModel().rows
  const selectable = !!onSelectedChange
  const sel = selected ?? []
  const allIds = rows.map((r) => r.id)
  const allOn = allIds.length > 0 && allIds.every((id) => sel.includes(id))
  const toggle = (id: string) => onSelectedChange?.(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])

  return (
    <div className="overflow-hidden rounded-[16px] border border-line-soft bg-paper">
      <table className={cn('w-full table-fixed border-collapse', renderCard && 'max-md:hidden')}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-paper-soft">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-line-soft">
              {selectable && (
                <th scope="col" className="w-11 pl-5">
                  <input type="checkbox" className={boxCls} aria-label="Selecionar todos" checked={allOn} onChange={() => onSelectedChange?.(allOn ? [] : allIds)} />
                </th>
              )}
              {hg.headers.map((h, i) => {
                const sorted = h.column.getIsSorted()
                const canSort = h.column.getCanSort()
                return (
                  <th
                    key={h.id}
                    scope="col"
                    style={{ width: h.column.columnDef.meta?.width }}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn('py-3 text-left font-normal', i === 0 && !selectable ? 'pl-5' : 'pl-0', i === hg.headers.length - 1 ? 'pr-5' : 'pr-3', h.column.columnDef.meta?.align === 'right' && 'text-right')}
                  >
                    {canSort ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className="eyebrow group inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === 'asc' ? <ArrowUp className="size-3" aria-hidden /> : sorted === 'desc' ? <ArrowDown className="size-3" aria-hidden /> : <ChevronsUpDown className="size-3 opacity-0 group-hover:opacity-60" aria-hidden />}
                      </button>
                    ) : (
                      <span className="eyebrow text-[11px] text-muted">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row.original) } } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row.original) : undefined}
              className={cn('border-b border-line-soft last:border-b-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-paper-soft focus-visible:bg-paper-soft focus-visible:outline-offset-[-2px]', (highlightId === row.id || sel.includes(row.id)) && 'bg-signal-soft/50')}
            >
              {selectable && (
                <td className="w-11 pl-5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className={boxCls} aria-label={`Selecionar ${rowLabel?.(row.original).replace(/^Abrir /, '') ?? row.id}`} checked={sel.includes(row.id)} onChange={() => toggle(row.id)} onKeyDown={(e) => e.stopPropagation()} />
                </td>
              )}
              {row.getVisibleCells().map((cell, i, all) => (
                <td key={cell.id} className={cn('py-3.5 align-middle text-[14px]', i === 0 && !selectable ? 'pl-5' : 'pl-0', i === all.length - 1 ? 'pr-5' : 'pr-3', cell.column.columnDef.meta?.align === 'right' && 'text-right')}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {renderCard && (
        <ul className="divide-y divide-line-soft md:hidden">
          {rows.map((row) => (
            <li key={row.id}>
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(row.original)} className="block w-full px-4 py-3.5 text-left active:bg-paper-soft">
                  {renderCard(row.original)}
                </button>
              ) : (
                <div className="px-4 py-3.5">{renderCard(row.original)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows.length === 0 && empty}
      {footer && <div className="border-t border-line-soft first:border-t-0">{footer}</div>}
    </div>
  )
}

export type { ColumnDef } from '@tanstack/react-table'
