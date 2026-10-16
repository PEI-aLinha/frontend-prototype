import { createBrowserRouter } from 'react-router'
import { HomeRedirect } from './HomeRedirect'
import { DesignPage } from './DesignPage'
import { ClientLayout, ConsultantLayout } from './layouts'
import { OutOfScope } from './OutOfScope'
import { Root } from './Root'
import { Guard } from './Guard'
import { AssetsPage } from '../features/assets/AssetsPage'
import { RegisterAssetsPage } from '../features/assets/RegisterAssetsPage'
import { HomePage } from '../features/home/HomePage'
import { TasksPage } from '../features/tasks/TasksPage'
import { AnalystOnly } from './AnalystOnly'
import { ConsultantRoadmap } from './ConsultantRoadmap'
import { RisksPage } from '../features/assets/risk/RisksPage'
import { PortfolioPage } from '../features/portfolio/PortfolioPage'
import { ClientOverviewPage } from '../features/portfolio/ClientOverviewPage'
import { HistoryPage } from '../features/portfolio/HistoryPage'

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
          { path: 'tarefas/:taskId/ativos', element: <AnalystOnly><RegisterAssetsPage /></AnalystOnly> },
          { path: 'roadmap', element: <Guard resource="roadmap"><ConsultantRoadmap /></Guard> },
          { path: 'riscos', element: <Guard resource="risk" reason="O registo de riscos fica visível depois de a consultora validar o roadmap."><RisksPage /></Guard> },
          { path: 'avaliacao', element: <OutOfScope eyebrow="Componentes Águeda, Lda." title="Avaliação" /> },
          { path: 'equipa', element: <OutOfScope eyebrow="Componentes Águeda, Lda." title="Equipa" /> },
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
          { path: 'historico', element: <HistoryPage /> },
        ],
      },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
])
