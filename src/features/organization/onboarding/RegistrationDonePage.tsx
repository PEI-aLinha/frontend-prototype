import { Link, Navigate } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { Card, buttonClass } from '../../../ui'
import { StepBadge } from './OnboardingLayout'
import { ConsultantCard } from '../consultant/ConsultantCard'
import { sectorById } from '../sectors'
import { useRegistration } from './registration'

const formatNif = (nif: string) => nif.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')

/** US10 · end of the flow: the organization is registered and associated with the account. */
export function RegistrationDonePage() {
  const { registered } = useRegistration()
  if (!registered?.profile) return <Navigate to="/" replace />

  const p = registered.profile
  const sector = sectorById(p.sector)
  const subsector = sector?.subsectors.find((s) => s.id === p.subsector)
  const rows: Array<[string, string]> = [
    ['Denominação', registered.name],
    ['NIF', formatNif(p.nif)],
    ['Setor', subsector ? `${sector?.label} · ${subsector.label}` : sector?.label ?? '—'],
    ['Trabalhadores', String(p.employees)],
    ['Sede', `${p.address.postalCode} ${p.address.city}`],
  ]

  return (
    <>
      <header className="flex flex-col gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-signal-soft text-brand"><CheckCircle2 className="size-6" aria-hidden /></span>
        <StepBadge>Registo concluído</StepBadge>
        <h1 className="text-[30px] font-extrabold title-tight">A {registered.name} está registada</h1>
        <p className="text-[16px] text-ink-soft">A organização ficou associada à sua conta. É o Responsável designado: vê toda a informação da empresa e pode convidar a sua equipa.</p>
      </header>

      <Card as="section" aria-labelledby="dados-registados" className="px-7 py-6 max-md:px-5">
        <h2 id="dados-registados" className="sr-only">Dados registados</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[160px_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[13px] font-semibold text-ink-soft">{label}</dt>
              <dd className="text-[15px] font-semibold text-ink max-sm:-mt-2">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <ConsultantCard orgId={registered.id} className="px-7 py-6 max-md:px-5" />

      <Link to={`/org/${registered.slug}/ambito/perguntas`} className={buttonClass({ className: 'w-fit max-sm:w-full' })}>Continuar</Link>
    </>
  )
}
