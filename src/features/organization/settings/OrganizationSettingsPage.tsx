import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BadgeCheck, Eye, FileText, Pencil } from 'lucide-react'
import { useToday } from '../../../api/queries'
import { shortDate } from '../../../config/labels'
import { useCan } from '../../../core/useCan'
import { useTenant } from '../../../core/tenant'
import { Button, Card, PageHeader } from '../../../ui'
import { Nis2Badge } from '../framing/Nis2Badge'
import { NIS2_LABEL, suggestNis2 } from '../framing/nis2Framing'
import { sectorById } from '../sectors'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import { documentUrl } from './documentStore'
import { QualificationModal } from './QualificationModal'

const formatNif = (nif: string) => nif.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
const formatPhone = (p: string) => p.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
const eur = (v: number) => `${v.toLocaleString('pt-PT')} €`

function DataList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[200px_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-[0.8125rem] font-semibold text-ink-soft">{label}</dt>
          <dd className="text-[0.9375rem] text-ink max-sm:-mt-2">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** US11 — organization settings: registration data and the official NIS2 qualification. */
export function OrganizationSettingsPage() {
  const org = useTenant()
  const can = useCan()
  const today = useToday()
  const [registering, setRegistering] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const p = org.profile
  const suggested = p ? suggestNis2(p).classification : null
  const official = org.officialQualification
  const sector = p ? sectorById(p.sector) : undefined
  const subsector = sector?.subsectors.find((s) => s.id === p?.subsector)
  const canEdit = can('edit', 'framing')

  const openDocument = () => {
    const url = official && documentUrl(org.id, official.document.name)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else setPreviewing(true)
  }

  return (
    <>
      <PageHeader eyebrow={org.name} title="Definições da organização" />

      <Card className="flex flex-col gap-4 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="section-title">Qualificação NIS2</h2>
          {canEdit && suggested && suggested !== 'nao_abrangida' && !official && today.data && (
            <Button icon={<BadgeCheck className="size-4" aria-hidden />} onClick={() => setRegistering(true)}>Registar qualificação oficial</Button>
          )}
          {canEdit && official && today.data && (
            <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setRegistering(true)}>Corrigir</Button>
          )}
        </div>
        {official ? (
          <DataList rows={[
            ['Classificação oficial', <span className="flex flex-wrap items-center gap-2"><span className="font-bold">{NIS2_LABEL[official.classification]}</span><Nis2Badge official /></span>],
            ['Data do Ato de Qualificação', shortDate(official.date)],
            ['Documento', (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{official.document.name}</span>
                <Button variant="link" size="sm" icon={<Eye className="size-4" aria-hidden />} onClick={openDocument}>Ver documento</Button>
              </span>
            )],
          ]} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.9375rem] font-bold">{suggested ? NIS2_LABEL[suggested] : '—'}</span>
              <Nis2Badge official={false} />
            </div>
            <p className="text-[0.875rem] text-ink-soft">
              {suggested === 'nao_abrangida'
                ? 'Pela sugestão do aLinha, a empresa não está abrangida, por isso não deve receber um Ato de Qualificação.'
                : 'É a sugestão do aLinha. Quando receber o Ato de Qualificação do CNCS, registe aqui a classificação oficial.'}{' '}
              <Link to={`/org/${org.slug}/enquadramento`} className="font-bold text-brand hover:underline">Ver o enquadramento</Link>
            </p>
          </>
        )}
        {official && (
          <p className="flex items-center gap-2 text-[0.8125rem] text-muted"><FileText className="size-4" aria-hidden />Registada a {shortDate(official.registeredAt)}</p>
        )}
      </Card>

      {p && (
        <Card className="flex flex-col gap-4 px-6 py-6">
          <h2 className="section-title">Dados da organização</h2>
          <DataList rows={[
            ['Denominação', org.name],
            ['NIF', formatNif(p.nif)],
            ['Código CAE', p.cae],
            ['Setor', subsector ? `${sector?.label} · ${subsector.label}` : sector?.label ?? '—'],
            ['Serviços prestados', p.services],
            ['Trabalhadores', String(p.employees)],
            ['Volume de negócios', eur(p.turnover)],
            ['Sede', `${p.address.street}, ${p.address.postalCode} ${p.address.city}`],
            ['Contactos', `${formatPhone(p.contacts.phone)} · ${p.contacts.email}`],
            ['Ponto de contacto permanente', `${p.permanentContact.name} · ${formatPhone(p.permanentContact.phone)}`],
          ]} />
        </Card>
      )}

      {registering && suggested && today.data && <QualificationModal suggested={suggested} today={today.data} current={official} onClose={() => setRegistering(false)} />}
      {previewing && official && <DocumentPreviewModal org={org} q={official} onClose={() => setPreviewing(false)} />}
    </>
  )
}
