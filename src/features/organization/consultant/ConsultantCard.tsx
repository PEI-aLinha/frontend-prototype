import { Mail, Phone } from 'lucide-react'
import { useConsultant } from '../../../api/queries'
import type { Id } from '../../../api/contracts'
import { Avatar, Card, Eyebrow, Skeleton, cn } from '../../../ui'

const formatPhone = (p: string) => p.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')

/** US01 — the client's consultant, assigned automatically (RF04), with the emergency contact (RF34). */
export function ConsultantCard({ orgId, className }: { orgId: Id; className?: string }) {
  const consultant = useConsultant(orgId)
  if (consultant.isPending) return <Card className={className}><Skeleton className="h-24" /></Card>
  const c = consultant.data
  if (!c) {
    return (
      <Card className={cn('flex flex-col gap-1.5', className)}>
        <Eyebrow>Acompanhamento aLinha</Eyebrow>
        <p className="text-[14px] text-ink-soft">A atribuir. Recebe um email quando houver alguém atribuído.</p>
      </Card>
    )
  }
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      <Eyebrow>{c.heading}</Eyebrow>
      <div className="flex items-center gap-3">
        <Avatar initials={c.initials} size={40} tone="dark" />
        <div className="min-w-0">
          <p className="truncate text-[18px] font-extrabold leading-tight">{c.name}</p>
          <p className="text-[13px] text-ink-soft">Consultoria aLinha</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-[14px]">
        <a href={`mailto:${c.email}`} className="flex items-center gap-2 font-semibold text-brand hover:underline"><Mail className="size-4 shrink-0" aria-hidden /><span className="truncate">{c.email}</span></a>
        <a href={`tel:+351${c.phone}`} className="flex items-center gap-2 font-semibold text-brand hover:underline"><Phone className="size-4 shrink-0" aria-hidden />{formatPhone(c.phone)}<span className="font-normal text-ink-soft">· também para emergências</span></a>
      </div>    </Card>
  )
}
