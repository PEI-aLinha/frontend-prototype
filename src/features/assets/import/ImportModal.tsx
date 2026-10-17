import { useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileUp, XCircle } from 'lucide-react'
import { useImportAssets } from '../../../api/queries'
import { useTenant } from '../../../core/tenant'
import { Button, Chip, Modal, Note, cn, useToast } from '../../../ui'
import { downloadCsv } from '../exportAssets'
import type { Inventory } from '../useInventory'
import { CSV_TEMPLATE, parseAssetCsv, type ParsedRow } from './parseAssetCsv'

const MAX_BYTES = 512 * 1024

const SAMPLE = [
  'Ativo;Tipo;Serviço crítico;Localização;Responsável;Criticidade',
  'Impressoras do escritório;Equipamento;;Escritório;Rui Santos;Baixa',
  'Software de desenho técnico (CAD);Aplicação;Produção de componentes;Gabinete técnico;Rui Santos;Média',
  'Router 4G de backup;Rede;Todos;Sala técnica;Pedro Almeida;Média',
  'Leitor de códigos de barras;Equipamento;Faturação e expedição;Armazém;Ana Costa;Baixa',
  ';Servidor;Produção de componentes;Sala técnica;Pedro Almeida;Alta',
  'Balança industrial;Máquina;Produção de componentes;Pavilhão 1;;Muito alta',
].join('\n')

/** Import assets from a spreadsheet (CSV), with preview and row-by-row validation. */
export function ImportModal({ open, onClose, inventory }: { open: boolean; onClose: () => void; inventory: Inventory }) {
  const org = useTenant()
  const toast = useToast()
  const importAssets = useImportAssets(org.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const load = (text: string, name: string) => {
    const result = parseAssetCsv(text, { services: inventory.services, users: inventory.users, existingNames: inventory.assets.map((a) => a.name) })
    setFileName(name)
    setError(result.error)
    setRows(result.error ? null : result.rows)
  }

  const readFile = (file: File | undefined) => {
    if (!file) return
    if (!/\.(csv|txt)$/i.test(file.name)) { setError('Escolha um ficheiro .csv (no Excel: Guardar como › CSV).'); return }
    if (file.size > MAX_BYTES) { setError('O ficheiro é demasiado grande (máximo 512 KB).'); return }
    file.text().then((t) => load(t, file.name)).catch(() => setError('Não foi possível ler o ficheiro.'))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    readFile(e.dataTransfer.files[0])
  }

  const valid = rows?.filter((r) => r.input) ?? []
  const invalid = rows?.filter((r) => !r.input) ?? []

  const confirm = () => importAssets.mutate(valid.map((r) => r.input!), {
    onSuccess: (created) => { toast.show(`${created.length} ativos importados`); onClose() },
    onError: (e) => toast.show(e.message, 'error'),
  })

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={720} chip={<Chip>Importar</Chip>} title="Importar ativos de uma folha de cálculo"
      description="Útil se já tem uma lista no Excel. Nada é gravado antes de rever a pré-visualização."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid.length} loading={importAssets.isPending} onClick={confirm}>{valid.length ? `Importar ${valid.length} ${valid.length === 1 ? 'ativo' : 'ativos'}` : 'Importar'}</Button>
      </>}>
      {!rows ? (
        <>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ['Descarregue o modelo', 'Tem as colunas certas e dois exemplos.'],
              ['Preencha no Excel', 'Uma linha por ativo. Guarde como CSV.'],
              ['Carregue o ficheiro', 'Mostramos o que está certo e o que falta.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-[12px] bg-paper-soft p-3.5">
                <span className="grid size-6 place-items-center rounded-full bg-brand text-[12px] font-extrabold text-white">{i + 1}</span>
                <p className="mt-2 text-[14px] font-bold">{t}</p>
                <p className="text-[13px] text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
          <Button variant="secondary" size="sm" className="self-start" icon={<Download className="size-4" aria-hidden />} onClick={() => downloadCsv('modelo-inventario-ativos.csv', CSV_TEMPLATE)}>Descarregar modelo (CSV)</Button>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn('flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition-colors', dragging ? 'border-brand bg-brand-soft/40' : 'border-line')}
          >
            <FileUp className="size-6 text-brand" aria-hidden />
            <p className="text-[14px] font-bold">Arraste o ficheiro CSV para aqui</p>
            <p className="text-[13px] text-ink-soft">ou</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => fileRef.current?.click()}>Escolher ficheiro</Button>
              <Button size="sm" variant="ghost" onClick={() => load(SAMPLE, 'exemplo-componentes-agueda.csv')}>Usar ficheiro de exemplo</Button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Escolher ficheiro CSV" onChange={(e) => readFile(e.target.files?.[0])} />
          </div>
          {error && <p role="alert" className="text-[13px] font-semibold text-danger">{error}</p>}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-bold">{fileName}</span>
            <Chip>{valid.length} prontos</Chip>
            {invalid.length > 0 && <Chip tone="neutral">{invalid.length} com erros (não entram)</Chip>}
            <Button variant="link" size="sm" className="ml-auto" onClick={() => { setRows(null); setFileName(null) }}>Escolher outro ficheiro</Button>
          </div>
          <div className="max-h-[320px] overflow-y-auto rounded-[12px] border border-line-soft">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Pré-visualização da importação</caption>
              <thead className="sticky top-0 bg-paper-soft">
                <tr>{['Linha', 'Ativo', 'Resultado'].map((h) => <th key={h} scope="col" className="eyebrow px-3 py-2 text-[10.5px] font-normal text-muted">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-t border-line-soft align-top">
                    <td className="px-3 py-2 text-muted">{r.line}</td>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.errors.map((e) => <p key={e} className="flex items-start gap-1.5 text-risk-high-ink"><XCircle className="mt-px size-3.5 shrink-0" aria-hidden />{e}</p>)}
                      {r.warnings.map((w) => <p key={w} className="flex items-start gap-1.5 text-risk-medium-ink"><AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />{w}</p>)}
                      {!r.errors.length && !r.warnings.length && <p className="flex items-center gap-1.5 text-brand"><CheckCircle2 className="size-3.5" aria-hidden />Pronto a importar</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>As linhas com erros não são importadas. Pode corrigi-las no ficheiro e voltar a carregar, ou registá-las à mão.</Note>
        </>
      )}
    </Modal>
  )
}
