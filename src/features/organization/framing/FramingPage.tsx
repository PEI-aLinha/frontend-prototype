import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useTenant } from '../../../core/tenant'
import { shortDate } from '../../../config/labels'
import { Card, EmptyState, Eyebrow, Note, PageHeader, buttonClass, cn } from '../../../ui'
import { Nis2Badge } from './Nis2Badge'
import { NIS2_LABEL, NIS2_MEANING, nis2Status, suggestNis2 } from './nis2Framing'

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

/** US11 — NIS2 framing: the suggestion from the registration data, replaced by the official CNCS qualification once registered. */
export function FramingPage() {
  const org = useTenant()
  const status = nis2Status(org)
  if (!org.profile || !status) return <EmptyState title="Faltam os dados do registo">Sem os dados da organização não é possível sugerir o enquadramento.</EmptyState>

  const f = suggestNis2(org.profile)
  const covered = status.classification !== 'nao_abrangida'
  const reasons = status.official ? [`Atribuída pelo CNCS no Ato de Qualificação de ${shortDate(status.date!)}.`] : f.reasons
  const settings = <Link to={`/org/${org.slug}/definicoes`} className="underline underline-offset-2">definições da organização</Link>

  return (
    <>
      <PageHeader eyebrow={org.name} title="Enquadramento NIS2" subtitle="Em que categoria da lei de cibersegurança a empresa fica." />

      <section aria-labelledby="enquadramento-titulo" className={cn('flex flex-col gap-5 rounded-[20px] px-8 py-[30px] max-md:px-6', covered ? 'bg-brand-deep text-white' : 'border border-line-soft bg-paper-soft')}>
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow className={covered ? 'text-signal-soft' : undefined}>{status.official ? 'Qualificação oficial' : 'Enquadramento sugerido'}</Eyebrow>
          <Nis2Badge official={status.official} onDark={covered} />
        </div>
        <h2 id="enquadramento-titulo" className="text-[34px] font-extrabold title-tight max-md:text-[28px]">{status.label}</h2>
        <ul className={cn('flex flex-col gap-1.5 text-[14px] font-semibold', covered ? 'text-brand-soft' : 'text-ink-soft')}>
          {reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      {status.official ? (
        <Note>
          {status.suggested && status.suggested !== status.classification
            ? <>A sugestão do aLinha era {NIS2_LABEL[status.suggested]}. A partir de agora conta a qualificação do CNCS. </>
            : <>A qualificação do CNCS confirma a sugestão do aLinha. </>}
          Pode consultar o Ato de Qualificação nas {settings}.
        </Note>
      ) : (
        <Note>
          Isto é uma sugestão. A qualificação oficial é atribuída pelo CNCS depois de a empresa se registar na plataforma MyCiber. Quando a receber, pode registá-la nas {settings}.
        </Note>
      )}

      <Card as="section" aria-labelledby="significado-titulo" className="flex flex-col gap-3 px-6 py-6">
        <h2 id="significado-titulo" className="text-[18px] font-extrabold">O que isto significa</h2>
        <Bullets items={NIS2_MEANING[status.classification]} />
      </Card>

      <p>
        <Link to={`/org/${org.slug}/ambito`} className={buttonClass({ variant: 'secondary' })}><ArrowLeft className="size-4" aria-hidden />Voltar ao âmbito regulatório</Link>
      </p>
    </>
  )
}
