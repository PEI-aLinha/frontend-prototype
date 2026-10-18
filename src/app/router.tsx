import { createBrowserRouter } from 'react-router'
import { HomeRedirect } from './HomeRedirect'
import { DesignPage } from './DesignPage'
import { ClientLayout, ConsultantLayout } from './layouts'
import { Root } from './Root'
import { Guard } from './Guard'
import { AssetsPage } from '../features/assets/AssetsPage'
import { RegisterAssetsPage } from '../features/assets/RegisterAssetsPage'
import { HomePage } from '../features/home/HomePage'
import { TasksPage } from '../features/tasks/TasksPage'
import { AnalystOnly } from './AnalystOnly'
import { TeamPage } from '../features/team/TeamPage'
import { ConsultantRoadmap } from './ConsultantRoadmap'
import { RisksPage } from '../features/assets/risk/RisksPage'
import { PortfolioPage } from '../features/portfolio/PortfolioPage'
import { ClientOverviewPage } from '../features/portfolio/ClientOverviewPage'
import { HistoryPage } from '../features/portfolio/HistoryPage'
import { IntegrationsPage } from '../features/integrations/IntegrationsPage'
import { AssessmentPage } from '../features/assessment/AssessmentPage'
import { QuestionPage } from '../features/tasks/QuestionPage'
import { CreateAccountPage, MfaSetupPage, OnboardingLayout, RegisterOrganizationPage, RegistrationDonePage, ResumeRegistration, ScopeQuestionsPage, ScopeResultPage, FramingPage, OrganizationSettingsPage, AcceptInvitePage } from '../features/organization/public'

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: '_design', element: <DesignPage /> },
      { path: 'convite/:token', element: <AcceptInvitePage /> },
      {
        path: 'registo',
        element: <OnboardingLayout />,
        children: [
          { index: true, element: <ResumeRegistration /> },
          { path: 'conta', element: <CreateAccountPage /> },
          { path: 'seguranca', element: <MfaSetupPage /> },
          { path: 'organizacao', element: <RegisterOrganizationPage /> },
          { path: 'concluido', element: <RegistrationDonePage /> },
        ],
      },
      {
        path: 'org/:org',
        element: <ClientLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'inicio', element: <Guard resource="roadmap"><HomePage /></Guard> },
          { path: 'ambito', element: <Guard resource="scope"><ScopeResultPage /></Guard> },
          { path: 'definicoes', element: <Guard resource="framing"><OrganizationSettingsPage /></Guard> },
          { path: 'enquadramento', element: <Guard resource="framing"><FramingPage /></Guard> },
          { path: 'ambito/perguntas', element: <Guard resource="scope" action="edit"><ScopeQuestionsPage /></Guard> },
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
