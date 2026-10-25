import { createBrowserRouter } from 'react-router'
import { HomeRedirect } from './HomeRedirect'
import { DesignPage } from './DesignPage'
import { ClientLayout, ConsultantLayout } from './layouts'
import { Root } from './Root'
import { Guard } from './Guard'
import { AnalystOnly } from './AnalystOnly'
import { ConsultantRoadmap } from './ConsultantRoadmap'
import {
  AssetsPage, RegisterAssetsPage, HomePage, TasksPage, TeamPage, RisksPage, PortfolioPage, ClientOverviewPage, HistoryPage, IntegrationsPage, AssessmentPage, SectionPage, AssessmentQuestionPage, QuestionPage,
} from './pages'
import { CreateAccountPage, MfaSetupPage, OnboardingLayout, RegisterOrganizationPage, RegistrationDonePage, ResumeRegistration, ScopeQuestionsPage, ScopeResultPage, FramingPage, OrganizationSettingsPage, AcceptInvitePage } from '../features/organization/public'


export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: '_design', handle: { title: 'Sistema de design' }, element: <DesignPage /> },
      { path: 'convite/:token', handle: { title: 'Aceitar convite' }, element: <AcceptInvitePage /> },
      {
        path: 'registo',
        handle: { title: 'Registo' },
        element: <OnboardingLayout />,
        children: [
          { index: true, element: <ResumeRegistration /> },
          { path: 'conta', handle: { title: 'Criar conta' }, element: <CreateAccountPage /> },
          { path: 'seguranca', handle: { title: 'Proteger a conta' }, element: <MfaSetupPage /> },
          { path: 'organizacao', handle: { title: 'Registar a organização' }, element: <RegisterOrganizationPage /> },
          { path: 'concluido', handle: { title: 'Registo concluído' }, element: <RegistrationDonePage /> },
        ],
      },
      {
        path: 'org/:org',
        element: <ClientLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'inicio', handle: { title: 'Início' }, element: <Guard resource="roadmap"><HomePage /></Guard> },
          { path: 'ambito', handle: { title: 'Âmbito regulatório' }, element: <Guard resource="scope"><ScopeResultPage /></Guard> },
          { path: 'definicoes', handle: { title: 'Definições da organização' }, element: <Guard resource="framing"><OrganizationSettingsPage /></Guard> },
          { path: 'enquadramento', handle: { title: 'Enquadramento NIS2' }, element: <Guard resource="framing"><FramingPage /></Guard> },
          { path: 'ambito/perguntas', handle: { title: 'Perguntas de âmbito' }, element: <Guard resource="scope" action="edit"><ScopeQuestionsPage /></Guard> },
          { path: 'ativos', handle: { title: 'Ativos' }, element: <Guard resource="asset"><AssetsPage /></Guard> },
          { path: 'tarefas', handle: { title: 'As minhas tarefas' }, element: <AnalystOnly><TasksPage /></AnalystOnly> },
          { path: 'tarefas/:taskId/pergunta', handle: { title: 'Pergunta técnica' }, element: <AnalystOnly><QuestionPage /></AnalystOnly> },
          { path: 'tarefas/:taskId/ativos', handle: { title: 'Registar ativos' }, element: <AnalystOnly><RegisterAssetsPage /></AnalystOnly> },
          { path: 'roadmap', handle: { title: 'Roadmap' }, element: <Guard resource="roadmap"><ConsultantRoadmap /></Guard> },
          { path: 'riscos', handle: { title: 'Riscos' }, element: <Guard resource="risk" reason="O registo de riscos fica visível depois de a consultora validar o roadmap."><RisksPage /></Guard> },
          { path: 'avaliacao', handle: { title: 'Avaliação' }, element: <Guard resource="roadmap"><AssessmentPage /></Guard> },
          { path: 'avaliacao/:sectionId', handle: { title: 'Secção da avaliação' }, element: <Guard resource="roadmap"><SectionPage /></Guard> },
          { path: 'avaliacao/:sectionId/:questionId', handle: { title: 'Pergunta da avaliação' }, element: <Guard resource="roadmap"><AssessmentQuestionPage /></Guard> },
          { path: 'integracoes', handle: { title: 'Integrações' }, element: <IntegrationsPage /> },
          { path: 'equipa', handle: { title: 'Equipa' }, element: <Guard resource="asset_task" action="assign"><TeamPage /></Guard> },
        ],
      },
      {
        path: 'carteira',
        handle: { title: 'Carteira de clientes' },
        element: <ConsultantLayout />,
        children: [{ index: true, element: <PortfolioPage /> }],
      },
      {
        path: 'clientes/:org',
        handle: { title: 'Visão geral do cliente' },
        element: <ConsultantLayout />,
        children: [
          { index: true, element: <ClientOverviewPage /> },
          { path: 'visao-geral', handle: { title: 'Visão geral do cliente' }, element: <ClientOverviewPage /> },
          { path: 'roadmap', handle: { title: 'Roadmap' }, element: <ConsultantRoadmap /> },
          { path: 'ativos', handle: { title: 'Ativos' }, element: <AssetsPage /> },
          { path: 'riscos', handle: { title: 'Riscos' }, element: <RisksPage /> },
          { path: 'integracoes', handle: { title: 'Integrações' }, element: <IntegrationsPage /> },
          { path: 'historico', handle: { title: 'Histórico' }, element: <HistoryPage /> },
        ],
      },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
])
