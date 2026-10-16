import { Link } from 'react-router'
import { CheckCircle2, FileSpreadsheet, FileText, TriangleAlert } from 'lucide-react'
import type { Asset } from '../../api/contracts'
import { useTenant } from '../../core/tenant'
import { Button, Chip, Modal, Note, useToast } from '../../ui'
import { assetRows, downloadCsv, printList, serviceRows, toListCsv } from './exportAssets'
import type { Inventory } from './useInventory'

function missing(a: Asset): string[] {
  const out: string[] = []
  if (!a.ownerId) out.push('responsável')
  if (!a.criticalServiceId) out.push('serviço crítico')
  if (!a.location) out.push('localização')
  return out
}

/** Check before reporting: every service needs an owner; every asset an owner, service and location. */
function Readiness({ inventory, base }: { inventory: Inventory; base: string }) {
  const gaps = inventory.assets.map((a) => ({ a, m: missing(a) })).filter((x) => x.m.length)
  const serviceGaps = inventory.services.filter((s) => !s.ownerId)
  const total = gaps.length + serviceGaps.length
  const ok = total === 0 && inventory.services.length > 0
  return (
    <section aria-label="Verificação da lista" className="flex flex-col gap-2 rounded-[14px] border border-line-soft p-4">
      <p className="flex items-center gap-2 text-[14px] font-bold">
        {ok ? <CheckCircle2 className="size-4 text-brand" aria-hidden /> : <TriangleAlert className="size-4 text-risk-medium-ink" aria-hidden />}
        {ok ? 'A lista está completa' : total === 0 ? 'Registe pelo menos um serviço crítico' : `${total} ${total === 1 ? 'registo tem' : 'registos têm'} informação em falta`}
      </p>
      <p className="text-[13px] text-ink-soft">O CNCS pede o responsável de cada serviço crítico e, para cada ativo, o responsável, o serviço que suporta e onde está. Pode exportar na mesma, mas complete antes de comunicar.</p>
      {total > 0 && (
        <ul className="flex max-h-[140px] flex-col gap-1 overflow-y-auto text-[13px]">
          {serviceGaps.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-soft px-2.5 py-1.5">
              <span><span className="font-semibold">{s.name}</span> <span className="text-muted">· serviço sem responsável</span></span>
              <Link to={`${base}?servicos=1`} className="shrink-0 font-bold text-brand hover:underline">Completar</Link>
            </li>
          ))}
          {gaps.map(({ a, m }) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-soft px-2.5 py-1.5">
              <span><span className="font-semibold">{a.name}</span> <span className="text-muted">· falta {m.join(', ')}</span></span>
              <Link to={`${base}?ativo=${a.id}`} className="shrink-0 font-bold text-brand hover:underline">Completar</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ExportModal({ open, onClose, inventory }: { open: boolean; onClose: () => void; inventory: Inventory }) {
  const org = useTenant()
  const toast = useToast()
  const rows = assetRows(inventory.assets, inventory)
  const services = serviceRows(inventory)
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} chip={<Chip>Regulamento n.º 756/2026</Chip>} title="Exportar Lista de Ativos"
      description={`${rows.length} ativos de ${inventory.services.length} serviços críticos. Use o ficheiro para preencher a Lista de Ativos a comunicar ao CNCS.`}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <Readiness inventory={inventory} base={typeof window !== 'undefined' ? window.location.pathname : ''} />
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => { downloadCsv('lista-de-ativos-componentes-agueda.csv', toListCsv(services, rows)); toast.show('Lista de Ativos exportada (CSV)') }}
          className="flex flex-col items-start gap-2 rounded-[14px] border border-line-soft p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40">
          <FileSpreadsheet className="size-5 text-brand" aria-hidden />
          <span className="font-bold">CSV</span>
          <span className="text-[13px] text-ink-soft">Para abrir no Excel ou copiar para o formulário.</span>
        </button>
        <button type="button" onClick={() => printList(org.name, services, rows)}
          className="flex flex-col items-start gap-2 rounded-[14px] border border-line-soft p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40">
          <FileText className="size-5 text-brand" aria-hidden />
          <span className="font-bold">PDF</span>
          <span className="text-[13px] text-ink-soft">Versão para imprimir ou guardar como PDF.</span>
        </button>
      </div>
      <Note>A submissão ao CNCS é feita fora do aLinha, no portal do CNCS. O aLinha só prepara a lista.</Note>
    </Modal>
  )
}
