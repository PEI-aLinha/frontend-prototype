import { useRef, useState } from 'react'
import { FileText, FileUp } from 'lucide-react'
import type { OfficialQualification, QualificationInput } from '../../../api/contracts'
import { useRegisterQualification } from '../../../api/queries'
import { useTenant } from '../../../core/tenant'
import { Button, Chip, Field, Modal, OptionGroup, cn, useToast, type OptionItem } from '../../../ui'
import { NIS2_LABEL, type Nis2Class } from '../framing/nis2Framing'
import { DateInput } from '../DateInput'
import { keepDocument } from './documentStore'

type Classification = QualificationInput['classification']
type Errors = Partial<Record<'classification' | 'date' | 'document', string>>

const MAX_BYTES = 10 * 1024 * 1024
const EXAMPLE_FILE = { name: 'Ato-de-Qualificacao-CNCS.pdf', size: 248_000 }
const OPTIONS: OptionItem<Classification>[] = [
  { value: 'essencial', label: NIS2_LABEL.essencial },
  { value: 'importante', label: NIS2_LABEL.importante },
]

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1000)).toLocaleString('pt-PT')} KB`

function validate(c: Classification | null, date: string, doc: QualificationInput['document'] | null, today: string): Errors {
  const e: Errors = {}
  if (!c) e.classification = 'Escolha a classificação que está no Ato de Qualificação.'
  if (!date) e.date = 'Indique a data do Ato de Qualificação.'
  else if (date > today) e.date = 'A data não pode ser no futuro.'
  if (!doc) e.document = 'Anexe o Ato de Qualificação em PDF.'
  else if (!/\.pdf$/i.test(doc.name)) e.document = 'O ficheiro tem de ser um PDF.'
  else if (doc.size > MAX_BYTES) e.document = 'O ficheiro tem mais de 10 MB. Use uma versão mais pequena.'
  return e
}

/** US11 — register (or correct) the official qualification from the CNCS: classification, date, attachment. */
export function QualificationModal({ suggested, today, current, onClose }: { suggested: Nis2Class; today: string; current?: OfficialQualification; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const save = useRegisterQualification(org.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [classification, setClassification] = useState<Classification | null>(current?.classification ?? null)
  const [date, setDate] = useState(current?.date ?? '')
  const [doc, setDoc] = useState<QualificationInput['document'] | null>(current?.document ?? null)
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validate(classification, date, doc, today) : {}

  const submit = () => {
    setSubmitted(true)
    if (Object.keys(validate(classification, date, doc, today)).length > 0) return
    save.mutate({ classification: classification!, date, document: doc! }, {
      onSuccess: () => {
        if (file && file.name === doc!.name) keepDocument(org.id, file)
        toast.show(current ? 'Qualificação oficial corrigida' : 'Qualificação oficial registada')
        onClose()
      },
    })
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} width={600} chip={<Chip>Qualificação NIS2</Chip>} title={current ? 'Corrigir qualificação oficial' : 'Registar qualificação oficial'}
      description="Use os dados do Ato de Qualificação que recebeu do CNCS."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={save.isPending}>{current ? 'Guardar correção' : 'Registar qualificação'}</Button></>}>
      <OptionGroup name="classification" legend={`Classificação atribuída pelo CNCS (a sugestão do aLinha era: ${NIS2_LABEL[suggested]})`} columns={2} value={classification} onChange={setClassification} options={OPTIONS} error={errors.classification} />

      <Field label="Data do Ato de Qualificação" error={errors.date} className="max-w-[260px]">
        {(p) => (
          <DateInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-ink-soft">Ato de Qualificação (PDF)</p>
        {doc ? (
          <div className={cn('flex items-center gap-3 rounded-[12px] border px-4 py-3', errors.document ? 'border-danger' : 'border-line-soft')}>
            <FileText className="size-5 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{doc.name}</span>
              <span className="block text-[12px] text-muted">{kb(doc.size)}</span>
            </span>
            <Button variant="link" size="sm" onClick={() => { setDoc(null); setFile(null) }}>{current ? 'Substituir' : 'Remover'}</Button>
          </div>
        ) : (
          <div className={cn('flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-6 text-center', errors.document ? 'border-danger' : 'border-line')}>
            <FileUp className="size-6 text-brand" aria-hidden />
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => fileRef.current?.click()}>Escolher ficheiro</Button>
              <Button size="sm" variant="ghost" onClick={() => setDoc(EXAMPLE_FILE)}>Usar ficheiro de exemplo</Button>
            </div>
            <p className="text-[12px] text-muted">PDF até 10 MB. No protótipo, o ficheiro não é enviado.</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="sr-only" aria-label="Escolher o Ato de Qualificação" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setDoc({ name: f.name, size: f.size }); setFile(f) } e.target.value = '' }} />
        {errors.document && <p role="alert" className="text-[13px] font-semibold text-danger">{errors.document}</p>}
      </div>

      {save.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[13px] font-semibold text-risk-high-ink">{save.error.message}</p>}
    </Modal>
  )
}
