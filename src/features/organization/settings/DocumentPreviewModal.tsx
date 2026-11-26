import type { OfficialQualification, Organization } from '../../../api/contracts'
import { shortDate } from '../../../config/labels'
import { Button, Chip, Modal, Note } from '../../../ui'
import { NIS2_LABEL } from '../framing/nis2Framing'

/** Stand-in for the attached PDF when the file is not in memory (example file, or after a page reload). */
export function DocumentPreviewModal({ org, q, onClose }: { org: Organization; q: OfficialQualification; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ['Entidade', org.name],
    ['NIF', org.profile?.nif.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') ?? '—'],
    ['Classificação', NIS2_LABEL[q.classification]],
    ['Data', shortDate(q.date)],
  ]
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} width={620} chip={<Chip tone="outline">Pré-visualização simulada</Chip>} title={q.document.name}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <Note>O protótipo não guarda ficheiros. No produto, abre o PDF que anexou.</Note>
      <article aria-label="Documento simulado" className="flex flex-col gap-5 rounded-[12px] border border-line-soft bg-paper-soft px-8 py-8 max-sm:px-5">
        <p className="eyebrow text-[0.6875rem] text-muted">Documento de exemplo</p>
        <h3 className="text-[1.625rem] font-extrabold title-tight">Ato de Qualificação</h3>
        <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[140px_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[0.8125rem] font-semibold text-ink-soft">{label}</dt>
              <dd className="text-[0.9375rem] text-ink max-sm:-mt-1.5">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2" aria-hidden>
          {[100, 94, 97, 60].map((w, i) => <span key={i} className="h-2 rounded-full bg-paper-deep" style={{ width: `${w}%` }} />)}
        </div>
      </article>
    </Modal>
  )
}
