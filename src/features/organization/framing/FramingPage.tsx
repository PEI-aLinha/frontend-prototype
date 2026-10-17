import { Link } from 'react-router'
import { Info } from 'lucide-react'
import { useTenant } from '../../../core/tenant'
import { Card, Chip, EmptyState, Eyebrow, Note, PageHeader, cn } from '../../../ui'
import { NIS2_LABEL, NIS2_MEANING, suggestNis2 } from './nis2Framing'

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink">
          <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-signal" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

/** US11 — NIS2 framing suggested from the registration data (RF02). */
export function FramingPage() {
  const org = useTenant()
  if (!org.profile) return <EmptyState title="Faltam os dados do registo">Sem os dados da organização não é possível sugerir o enquadramento.</EmptyState>

  const f = suggestNis2(org.profile)
  const covered = f.classification !== 'nao_abrangida'

  return (
    <>
      <PageHeader eyebrow={org.name} title="Enquadramento NIS2" subtitle="Em que categoria da lei de cibersegurança a empresa fica." />

      <section className={cn('flex flex-col gap-5 rounded-[20px] px-8 py-[30px] max-md:px-6', covered ? 'bg-brand-deep text-white' : 'border border-line-soft bg-paper-soft')}>
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow className={covered ? 'text-signal-soft' : undefined}>Enquadramento sugerido</Eyebrow>
          <Chip tone={covered ? 'signal' : 'outline'} icon={<Info className="size-3.5" aria-hidden />}>Indicativo</Chip>
        </div>
        <h2 className="text-[34px] font-extrabold title-tight max-md:text-[28px]">{NIS2_LABEL[f.classification]}</h2>
        <ul className={cn('flex flex-col gap-1.5 text-[14px] font-semibold', covered ? 'text-brand-soft' : 'text-ink-soft')}>
          {f.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      <Note>
        Isto é uma sugestão. A qualificação oficial é atribuída pelo CNCS depois de a empresa se registar na plataforma MyCiber. Quando a receber, pode registá-la nas <Link to={`/org/${org.slug}/definicoes`} className="underline underline-offset-2">definições da organização</Link>.
      </Note>

      <Card className="flex flex-col gap-3 px-6 py-6">
        <h2 className="text-[18px] font-extrabold">O que isto significa</h2>
        <Bullets items={NIS2_MEANING[f.classification]} />
      </Card>
    </>
  )
}
