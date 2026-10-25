import { useId } from 'react'
import { Link, Navigate } from 'react-router'
import { ArrowRight, Check, CircleHelp, Minus, Pencil } from 'lucide-react'
import { useCan } from '../../../core/useCan'
import { useTenant } from '../../../core/tenant'
import { Card, Chip, EmptyState, Eyebrow, PageHeader, buttonClass, cn } from '../../../ui'
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
  const titleId = useId()
  return (
    <Card aria-labelledby={titleId} soft={!applies} className={cn('flex h-full flex-col gap-4 rounded-[16px] px-6 py-6', applies && 'border-brand/30')}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className={cn('text-[1.375rem] font-extrabold title-tight', !applies && 'text-ink-soft')}>{r.name}</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-soft">{r.fullName}</p>
        </div>
        <Chip tone={st.tone} icon={<Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}>{st.label}</Chip>
      </header>
      <p className={cn('text-[0.875rem]', applies ? 'font-semibold text-ink' : 'text-ink-soft')}>{applies ? r.reason : <><span className="font-bold">Motivo: </span>{r.reason}</>}</p>
      {r.implications.length > 0 && (
        <section aria-labelledby={`${titleId}-implicacoes`} className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <Eyebrow as="h3"><span id={`${titleId}-implicacoes`}>{applies ? 'O que implica' : 'O que fazer'}</span></Eyebrow>
          <ul className="flex flex-col gap-2">
            {r.implications.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[0.875rem] text-ink">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-signal" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {framingLink && (
        <Link to={framingLink} className="group mt-auto flex flex-col gap-0.5 rounded-[12px] bg-brand-soft px-4 py-3 text-brand transition-colors hover:bg-signal-soft">
          <span className="text-[0.75rem] font-semibold">{official ? 'Enquadramento oficial · CNCS' : 'Enquadramento sugerido · indicativo'}</span>
          <span className="inline-flex items-center gap-1.5 text-[0.875rem] font-bold group-hover:underline">Ver o enquadramento NIS2 <ArrowRight className="size-4" aria-hidden /></span>
        </Link>
      )}
    </Card>
  )
}

/** US34 — legal frameworks that apply to the organization (NIS2, RGPD, AI Act), in plain language. */
export function ScopeResultPage() {
  const org = useTenant()
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
        actions={canEdit && <Link to="perguntas" className={buttonClass({ variant: 'secondary' })}><Pencil className="size-4" aria-hidden />Mudar respostas</Link>} />
      <ul role="list" aria-label="Leis avaliadas" className="grid gap-4 lg:grid-cols-3">
        {results.map((r) => (
          <li key={r.id}>
            <FrameworkCard r={r} framingLink={r.id === 'nis2' ? `/org/${org.slug}/enquadramento` : undefined} official={nis2Status(org)?.official} />
          </li>
        ))}
      </ul>
    </>
  )
}
