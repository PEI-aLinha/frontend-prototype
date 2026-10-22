import { createBrowserRouter } from 'react-router'
import { HomeRedirect } from './HomeRedirect'
import { DesignPage } from './DesignPage'
import { ClientLayout, ConsultantLayout } from './layouts'
import { Root } from './Root'
import { Guard } from './Guard'
import { AnalystOnly } from './AnalystOnly'
import { ConsultantRoadmap } from './ConsultantRoadmap'
import {
  AssetsPage, RegisterAssetsPage, HomePage, TasksPage, TeamPage, RisksPage, PortfolioPage, ClientOverviewPage, HistoryPage, IntegrationsPage, AssessmentPage, QuestionPage,
} from './pages'


export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: '_design', element: <DesignPage /> },
      {
        path: 'org/:org',
        element: <ClientLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'inicio', element: <Guard resource="roadmap"><HomePage /></Guard> },
          { path: 'ativos', element: <Guard resource="asset"><AssetsPage /></Guard> },
          { path: 'tarefas', element: <AnalystOnly><TasksPage /></AnalystOnly> },
          { path: 'tarefas/:taskId/pergunta', element: <AnalystOnly><QuestionPage /></AnalystOnly> },
          { path: 'tarefas/:taskId/ativos', element: <AnalystOnly><RegisterAssetsPage /></AnalystOnly> },
          { path: 'roadmap', element: <Guard resource="roadmap"><ConsultantRoadmap /></Guard> },
          { path: 'riscos', element: <Guard resource="risk" reason="O registo de riscos fica visível depois de a consultora validar o roadmap."><RisksPage /></Guard> },
          { path: 'avaliacao', element: <Guard resource="roadmap"><AssessmentPage /></Guard> },
          { path: 'integracoes', element: <IntegrationsPage /> },
          { path: 'equipa', element: <Guard resource="asset_task" action="assign"><TeamPage /></Guard> },
        ],
      },
      {
        path: 'carteira',
        element: <ConsultantLayout />,
        children: [{ index: true, element: <PortfolioPage /> }],
      },
      {
        path: 'clientes/:org',
        element: <ConsultantLayout />,
        children: [
          { index: true, element: <ClientOverviewPage /> },
          { path: 'visao-geral', element: <ClientOverviewPage /> },
          { path: 'roadmap', element: <ConsultantRoadmap /> },
          { path: 'ativos', element: <AssetsPage /> },
          { path: 'riscos', element: <RisksPage /> },
          { path: 'integracoes', element: <IntegrationsPage /> },
          { path: 'historico', element: <HistoryPage /> },
        ],
      },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
])
