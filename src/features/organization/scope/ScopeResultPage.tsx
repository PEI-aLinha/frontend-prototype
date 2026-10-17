import { Link, Navigate, useNavigate } from 'react-router'
import { ArrowRight, Check, CircleHelp, Minus, Pencil } from 'lucide-react'
import { useCan } from '../../../core/useCan'
import { useTenant } from '../../../core/tenant'
import { Button, Card, Chip, EmptyState, PageHeader, cn } from '../../../ui'
import { nis2Status } from '../framing/nis2Framing'
import { computeScope, type Applicability, type FrameworkResult } from './regulatoryScope'

const STATUS: Record<Applicability, { label: string; tone: 'dark' | 'neutral' | 'outline'; icon: typeof Check }> = {
  aplica: { label: 'Aplica-se', tone: 'dark', icon: Check },
  nao_aplica: { label: 'Não se aplica', tone: 'neutral', icon: Minus },
  por_confirmar: { label: 'Por confirmar', tone: 'outline', icon: CircleHelp },
}

function FrameworkCard({ r, framingLink, official }: { r: FrameworkResult; framingLink?: string; official?: boolean }) {
  const st = STATUS[r.applicability]
  const Icon = st.icon
  const applies = r.applicability === 'aplica'
  return (
    <Card soft={!applies} className={cn('flex flex-col gap-4 rounded-[16px] px-6 py-6', applies && 'border-brand/30')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={cn('text-[22px] font-extrabold title-tight', !applies && 'text-ink-soft')}>{r.name}</h2>
          <p className="mt-1 text-[13px] text-ink-soft">{r.fullName}</p>
        </div>
        <Chip tone={st.tone} icon={<Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}>{st.label}</Chip>
      </div>
      <p className={cn('text-[14px]', applies ? 'font-semibold text-ink' : 'text-ink-soft')}>{applies ? r.reason : <><span className="font-bold">Motivo: </span>{r.reason}</>}</p>
      {r.implications.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <p className="eyebrow text-[11px] text-muted">{applies ? 'O que implica' : 'O que fazer'}</p>
          <ul className="flex flex-col gap-2">
            {r.implications.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-signal" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {framingLink && (
        <Link to={framingLink} className="group mt-auto flex flex-col gap-0.5 rounded-[12px] bg-brand-soft px-4 py-3 text-brand transition-colors hover:bg-signal-soft">
          <span className="text-[12px] font-semibold">{official ? 'Enquadramento oficial · CNCS' : 'Enquadramento sugerido · indicativo'}</span>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-bold group-hover:underline">Ver o enquadramento NIS2 <ArrowRight className="size-4" aria-hidden /></span>
        </Link>
      )}
    </Card>
  )
}

/** US34 — legal frameworks that apply to the organization (NIS2, RGPD, AI Act), in plain language. */
export function ScopeResultPage() {
  const org = useTenant()
  const navigate = useNavigate()
  const can = useCan()
  const canEdit = can('edit', 'scope')

  if (!org.scope) {
    if (canEdit) return <Navigate to="perguntas" replace />
    return <EmptyState title="Ainda sem respostas">O Responsável designado ainda não respondeu às perguntas sobre dados pessoais e inteligência artificial.</EmptyState>
  }

  const results = computeScope(org)
  const applying = results.filter((r) => r.applicability === 'aplica').map((r) => r.name)
  const subtitle = applying.length === 0 ? 'Com as respostas dadas, nenhuma destas leis se aplica.' : `Aplica-se: ${applying.join(', ')}.`

  return (
    <>
      <PageHeader eyebrow={org.name} title="Que leis se aplicam à empresa" subtitle={subtitle}
        actions={canEdit && <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} onClick={() => navigate('perguntas')}>Mudar respostas</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {results.map((r) => (
          <FrameworkCard key={r.id} r={r} framingLink={r.id === 'nis2' ? `/org/${org.slug}/enquadramento` : undefined} official={nis2Status(org)?.official} />
        ))}
      </div>
    </>
  )
}
