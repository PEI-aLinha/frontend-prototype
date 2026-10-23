import { Link } from 'react-router'
import { Building2, UserRound } from 'lucide-react'
import { useAssets, useOrganization, useRisks, useRoadmapStatus, useUsers } from '../api/queries'
import { ROLE_LABEL, dateTime } from '../config/labels'
import { computeRiskLevel } from '../features/assets/public'
import { applicableFrameworks, nis2Status, sectorById } from '../features/organization/public'
import { Chip } from '../ui'

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.1em] text-muted'

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-brand-soft py-2 first:border-t-0 first:pt-0">
      <dt className={LABEL}>{label}</dt>
      <dd className="text-[13px] font-bold text-ink">{value}</dd>
      {hint && <dd className="text-[12px] text-ink-soft">{hint}</dd>}
    </div>
  )
}

/** Resumo da empresa que a consultora está a ajudar, mostrado ao lado da conversa. */
export function ChatClientContext({ orgSlug, ownerId }: { orgSlug: string; ownerId?: string }) {
  const { data: org } = useOrganization(orgSlug)
  const users = useUsers(org?.id)
  const assets = useAssets(org?.id)
  const risks = useRisks(org?.id)
  const roadmap = useRoadmapStatus(org?.id)

  if (!org) return <p className="text-[13px] text-muted">A carregar o contexto do cliente…</p>

  const nis2 = nis2Status(org)
  const owner = users.data?.find((u) => u.id === ownerId)
  const sector = org.profile ? sectorById(org.profile.sector)?.label : undefined
  const criticalAssets = assets.data?.filter((a) => a.criticality === 'alto').length
  const highRisks = risks.data?.filter((r) => computeRiskLevel(r.probability, r.impact).level === 'alto').length
  const completedAt = roadmap.data?.assessmentCompletedAt

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-paper text-brand" aria-hidden>
          <Building2 className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <strong className="text-[14px] font-extrabold text-brand">{org.name}</strong>
          <span className="text-[12px] leading-snug text-ink-soft">
            {[sector, org.profile && `${org.profile.employees} trabalhadores`].filter(Boolean).join(' · ') || org.description}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {nis2 && <Chip tone="neutral">{`${nis2.label}${nis2.official ? '' : ' (indicativa)'}`}</Chip>}
        {(applicableFrameworks(org) ?? org.frameworks).map((f) => <Chip key={f} tone="neutral">{f}</Chip>)}
      </div>

      {owner && (
        <div className="flex items-center gap-2 rounded-[10px] bg-paper px-3 py-2">
          <UserRound className="size-4 flex-none text-brand" aria-hidden />
          <span className="min-w-0 text-[12.5px] leading-snug">
            <strong className="text-ink">{owner.name}</strong>
            <span className="block text-ink-soft">{ROLE_LABEL[owner.role]}</span>
          </span>
        </div>
      )}

      <dl className="flex flex-col">
        <Row label="Avaliação" value={completedAt ? 'Submetida' : 'Em curso'} hint={completedAt ? dateTime(completedAt) : undefined} />
        <Row label="Ativos" value={assets.data ? `${assets.data.length} registados` : '…'} hint={criticalAssets ? `${criticalAssets} de criticidade alta` : undefined} />
        <Row label="Riscos" value={risks.data ? `${risks.data.length} registados` : '…'} hint={highRisks ? `${highRisks} de nível alto` : undefined} />
        <Row label="Roadmap" value={roadmap.data ? (roadmap.data.validated ? 'Validado' : 'Por validar') : '…'} />
      </dl>

      <Link to={`/clientes/${org.slug}/visao-geral`} className="text-[13px] font-bold text-brand hover:underline">
        Abrir visão geral do cliente →
      </Link>
    </div>
  )
}
