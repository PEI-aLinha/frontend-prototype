import type { ReactNode } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import {
  Boxes, Briefcase, ClipboardCheck, ClipboardList, History, Home, LayoutDashboard, ListChecks, Map, Plug, Scale, ShieldAlert, Users,
} from 'lucide-react'
import { useOrganization, useRoadmapStatus } from '../api/queries'
import { homePath } from '../core/personas'
import { canRole } from '../core/rbac'
import { useSession } from '../core/session'
import { TenantProvider } from '../core/tenant'
import { ErrorState, SkeletonRows } from '../ui'
import { AppShell, type NavItem, type NavSection } from './AppShell'
import { NotificationBell } from './NotificationBell'

function OrgGate({ slug, children }: { slug: string; children: (org: NonNullable<ReturnType<typeof useOrganization>['data']>) => ReactNode }) {
  const org = useOrganization(slug)
  if (org.isPending) return <div className="p-14"><SkeletonRows /></div>
  if (org.isError) return <div className="p-14"><ErrorState error={org.error} onRetry={() => org.refetch()} /></div>
  return <TenantProvider org={org.data}>{children(org.data)}</TenantProvider>
}

/** Rui (designated manager) and Pedro (analyst): /org/:org/* */
export function ClientLayout() {
  const { org = '' } = useParams()
  const { persona } = useSession()
  if (persona.role === 'consultor') return <Navigate to={`/clientes/${org}/visao-geral`} replace />
  return <OrgGate slug={org}>{(o) => <ClientShell orgId={o.id} slug={org} orgName={o.name} />}</OrgGate>
}

function ClientShell({ orgId, slug, orgName }: { orgId: string; slug: string; orgName: string }) {
  const { persona } = useSession()
  const roadmap = useRoadmapStatus(orgId)
  const base = `/org/${slug}`
  let items: NavItem[]
  if (persona.role === 'analista') {
    items = [
      { to: `${base}/tarefas`, label: 'As minhas tarefas', shortLabel: 'Tarefas', icon: ListChecks },
      { to: `${base}/ativos`, label: 'Ativos', icon: Boxes },
      { to: `${base}/integracoes`, label: 'Integrações', icon: Plug },
    ]
  } else {
    const seesRisks = canRole(persona.role, 'view', 'risk', { roadmapValidated: roadmap.data?.validated })
    items = [
      { to: `${base}/inicio`, label: 'Início', icon: Home },
      { to: `${base}/ambito`, label: 'Âmbito regulatório', shortLabel: 'Leis', icon: Scale },
      { to: `${base}/avaliacao`, label: 'Avaliação', icon: ClipboardCheck },
      { to: `${base}/roadmap`, label: 'Resultados e roadmap', shortLabel: 'Resultados', icon: Map },
      { to: `${base}/ativos`, label: 'Ativos', icon: Boxes },
      ...(seesRisks ? [{ to: `${base}/riscos`, label: 'Riscos', icon: ShieldAlert }] : []),
      { to: `${base}/integracoes`, label: 'Integrações', icon: Plug },
      { to: `${base}/equipa`, label: 'Equipa', icon: Users },
    ]
  }
  return (
    <AppShell tools={<NotificationBell />} sections={[{ items }]} user={{ initials: persona.initials, name: persona.name, subtitle: persona.role === 'analista' ? 'Analista' : orgName.replace(', Lda.', '') }}>
      <Outlet />
    </AppShell>
  )
}

/** Marta (Consultora): /carteira e /clientes/:org/* */
export function ConsultantLayout() {
  const { org } = useParams()
  const { persona } = useSession()
  if (persona.role !== 'consultor') return <Navigate to={homePath(persona.key)} replace />
  const user = { initials: persona.initials, name: persona.name, subtitle: 'Consultora aLinha' }
  const portfolio: NavItem = { to: '/carteira', label: 'Carteira de clientes', shortLabel: 'Clientes', icon: Briefcase, end: true }
  if (!org) {
    return (
      <AppShell tools={<NotificationBell />} sections={[{ items: [portfolio] }]} user={user}>
        <Outlet />
      </AppShell>
    )
  }
  return (
    <OrgGate slug={org}>
      {(o) => {
        const base = `/clientes/${org}`
        const client: NavItem[] = [
          { to: `${base}/visao-geral`, label: 'Visão geral', shortLabel: 'Geral', icon: LayoutDashboard },
          { to: `${base}/roadmap`, label: 'Avaliação e roadmap', shortLabel: 'Roadmap', icon: ClipboardList },
          { to: `${base}/ativos`, label: 'Ativos', icon: Boxes },
          { to: `${base}/riscos`, label: 'Riscos', icon: ShieldAlert },
          { to: `${base}/integracoes`, label: 'Evidências automáticas', shortLabel: 'Evidências', icon: Plug },
          { to: `${base}/historico`, label: 'Histórico', icon: History },
        ]
        const sections: NavSection[] = [{ items: [portfolio] }, { heading: o.name.replace(', Lda.', ''), items: client }]
        return (
          <AppShell tools={<NotificationBell />} sections={sections} user={user} tabs={[portfolio, client[3], client[1], client[2], client[0], client[4], client[5]]}>
            <Outlet />
          </AppShell>
        )
      }}
    </OrgGate>
  )
}
