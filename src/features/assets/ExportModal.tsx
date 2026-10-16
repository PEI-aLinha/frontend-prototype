import { FileSpreadsheet, FileText } from 'lucide-react'
import { useTenant } from '../../core/tenant'
import { Button, Chip, Modal, Note, useToast } from '../../ui'
import { assetRows, downloadCsv, printList, toCsv } from './exportAssets'
import type { Inventory } from './useInventory'

export function ExportModal({ open, onClose, inventory }: { open: boolean; onClose: () => void; inventory: Inventory }) {
  const org = useTenant()
  const toast = useToast()
  const rows = assetRows(inventory.assets, inventory)
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} chip={<Chip>Regulamento n.º 756/2026</Chip>} title="Exportar Lista de Ativos"
      description={`${rows.length} ativos de ${inventory.services.length} serviços críticos. Use o ficheiro para preencher a Lista de Ativos a comunicar ao CNCS.`}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => { downloadCsv('lista-de-ativos-componentes-agueda.csv', toCsv(rows)); toast.show('Lista de Ativos exportada (CSV)') }}
          className="flex flex-col items-start gap-2 rounded-[14px] border border-line-soft p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40">
          <FileSpreadsheet className="size-5 text-brand" aria-hidden />
          <span className="font-bold">CSV</span>
          <span className="text-[13px] text-ink-soft">Para abrir no Excel ou copiar para o formulário.</span>
        </button>
        <button type="button" onClick={() => printList(org.name, rows)}
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
