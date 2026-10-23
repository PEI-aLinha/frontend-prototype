import { lazy } from 'react'

// Feature pages load per route: the first screen only downloads what it shows.
export const AssetsPage = lazy(() => import('../features/assets/AssetsPage').then((m) => ({ default: m.AssetsPage })))
export const RegisterAssetsPage = lazy(() => import('../features/assets/RegisterAssetsPage').then((m) => ({ default: m.RegisterAssetsPage })))
export const HomePage = lazy(() => import('../features/home/HomePage').then((m) => ({ default: m.HomePage })))
export const TasksPage = lazy(() => import('../features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })))
export const TeamPage = lazy(() => import('../features/team/TeamPage').then((m) => ({ default: m.TeamPage })))
export const RisksPage = lazy(() => import('../features/assets/risk/RisksPage').then((m) => ({ default: m.RisksPage })))
export const PortfolioPage = lazy(() => import('../features/portfolio/PortfolioPage').then((m) => ({ default: m.PortfolioPage })))
export const ClientOverviewPage = lazy(() => import('../features/portfolio/ClientOverviewPage').then((m) => ({ default: m.ClientOverviewPage })))
export const HistoryPage = lazy(() => import('../features/portfolio/HistoryPage').then((m) => ({ default: m.HistoryPage })))
export const IntegrationsPage = lazy(() => import('../features/integrations/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })))
export const AssessmentPage = lazy(() => import('../features/assessment/AssessmentPage').then((m) => ({ default: m.AssessmentPage })))
export const QuestionPage = lazy(() => import('../features/tasks/QuestionPage').then((m) => ({ default: m.QuestionPage })))
export const SectionPage = lazy(() => import('../features/assessment/SectionPage').then((m) => ({ default: m.SectionPage })))
export const AssessmentQuestionPage = lazy(() => import('../features/assessment/AssessmentQuestionPage').then((m) => ({ default: m.AssessmentQuestionPage })))
