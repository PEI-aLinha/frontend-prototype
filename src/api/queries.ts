// TanStack Query hooks on top of the contracts. Components use only these, never the mock.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AssetBulkChange, AssetInput, ChatConversation, ChatMessageInput, QuestionAnswer, DiscoveryDecision, ProviderId, RiskStatusChange, CriticalService, Id, ProposeActionInput, RiskInput, TaskInput } from './contracts'

export const keys = {
  org: (slug: string) => ['org', slug] as const,
  users: (org: Id) => ['users', org] as const,
  services: (org: Id) => ['services', org] as const,
  assets: (org: Id) => ['assets', org] as const,
  asset: (org: Id, id: Id) => ['assets', org, id] as const,
  tasks: (org: Id) => ['tasks', org] as const,
  risks: (org: Id) => ['risks', org] as const,
  links: (org: Id) => ['links', org] as const,
  comments: (org: Id, asset: Id) => ['comments', org, asset] as const,
  actions: (org: Id) => ['actions', org] as const,
  roadmap: (org: Id) => ['roadmap', org] as const,
  portfolio: () => ['portfolio'] as const,
  audit: (org: Id, entityId?: Id) => ['audit', org, entityId ?? 'all'] as const,
  notifications: () => ['notifications'] as const,
  today: () => ['today'] as const,
  assessment: (org: Id) => ['assessment', org] as const,
  integrations: (org: Id) => ['integrations', org] as const,
  discoveries: (org: Id) => ['discoveries', org] as const,
  evidence: (org: Id) => ['evidence', org] as const,
  chat: (scopeKey: string, userId: Id) => ['chat', userId, scopeKey] as const,
}

const enabled = (org: Id | undefined) => ({ enabled: !!org })

export const useOrganization = (slug: string) => useQuery({ queryKey: keys.org(slug), queryFn: () => api.directory.getOrganization(slug) })
export const useUsers = (org?: Id) => useQuery({ queryKey: keys.users(org!), queryFn: () => api.directory.listUsers(org!), ...enabled(org) })
export const useServices = (org?: Id) => useQuery({ queryKey: keys.services(org!), queryFn: () => api.assets.listServices(org!), ...enabled(org) })
export const useAssets = (org?: Id) => useQuery({ queryKey: keys.assets(org!), queryFn: () => api.assets.listAssets(org!), ...enabled(org) })
export const useTasks = (org?: Id) => useQuery({ queryKey: keys.tasks(org!), queryFn: () => api.assets.listTasks(org!), ...enabled(org) })
export const useRisks = (org?: Id, on = true) => useQuery({ queryKey: keys.risks(org!), queryFn: () => api.assets.listRisks(org!), enabled: !!org && on })
export const useRiskLinks = (org?: Id, on = true) => useQuery({ queryKey: keys.links(org!), queryFn: () => api.assets.listRiskLinks(org!), enabled: !!org && on })
export const useComments = (org: Id | undefined, assetId: Id) => useQuery({ queryKey: keys.comments(org!, assetId), queryFn: () => api.assets.listComments(org!, assetId), ...enabled(org) })
export const useActions = (org?: Id, on = true) => useQuery({ queryKey: keys.actions(org!), queryFn: () => api.assessment.listActions(org!), enabled: !!org && on })
export const useRoadmapStatus = (org?: Id) => useQuery({ queryKey: keys.roadmap(org!), queryFn: () => api.assessment.getRoadmapStatus(org!), ...enabled(org) })
export const usePortfolio = () => useQuery({ queryKey: keys.portfolio(), queryFn: () => api.assessment.listPortfolio() })
export const useAudit = (org?: Id, entityId?: Id, on = true) => useQuery({ queryKey: keys.audit(org!, entityId), queryFn: () => api.audit.list(org!, entityId ? { entityId } : undefined), enabled: !!org && on })

export const useIntegrations = (org?: Id) => useQuery({ queryKey: keys.integrations(org!), queryFn: () => api.integrations.list(org!), ...enabled(org) })
export const useDiscoveries = (org?: Id) => useQuery({ queryKey: keys.discoveries(org!), queryFn: () => api.integrations.listDiscoveries(org!), ...enabled(org) })
export const useEvidence = (org?: Id) => useQuery({ queryKey: keys.evidence(org!), queryFn: () => api.integrations.listEvidence(org!), ...enabled(org) })

export const useChatHistory = (scopeKey: string, userId: Id) => useQuery({
  queryKey: keys.chat(scopeKey, userId),
  queryFn: () => api.chat.list(scopeKey),
  refetchInterval: 5000, // para o Rui ver a resposta da Marta sem recarregar
})

export const useSendChatMessage = () => useMutation({
  mutationFn: ({ organizationId, messages }: { organizationId?: Id; messages: ChatMessageInput[] }) => api.chat.send(organizationId, messages),
})

export function useSaveChatConversation(scopeKey: string, userId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversation: ChatConversation) => api.chat.save(scopeKey, conversation),
    onSuccess: (conversation) => qc.setQueryData<ChatConversation[]>(keys.chat(scopeKey, userId), (current = []) => {
      const exists = current.some((item) => item.id === conversation.id)
      return exists ? current.map((item) => item.id === conversation.id ? conversation : item) : [...current, conversation]
    }),
  })
}

export function useDeleteChatConversation(scopeKey: string, userId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: Id) => api.chat.delete(scopeKey, conversationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.chat(scopeKey, userId) }),
  })
}

export function useReviewChatConversation(scopeKey: string, userId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: Id) => api.chat.review(scopeKey, conversationId),
    onSuccess: (conversation) => {
      qc.setQueryData<ChatConversation[]>(keys.chat(scopeKey, userId), (current = []) => current.map((item) => item.id === conversation.id ? conversation : item))
      return qc.invalidateQueries({ queryKey: keys.notifications() })
    },
  })
}

export const useAssessment = (org?: Id) => useQuery({ queryKey: keys.assessment(org!), queryFn: () => api.assessment.getAssessment(org!), ...enabled(org) })

function useInvalidate() {
  const qc = useQueryClient()
  return (...prefixes: string[]) => Promise.all([...prefixes, 'notifications'].map((p) => qc.invalidateQueries({ queryKey: [p] })))
}

export function useSaveAsset(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ input, id }: { input: AssetInput; id?: Id }) => api.assets.saveAsset(org, input, id),
    onSuccess: () => invalidate('assets', 'audit', 'tasks'),
  })
}

export function useDeleteAsset(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => api.assets.deleteAsset(org, id), onSuccess: () => invalidate('assets', 'audit', 'risks') })
}

export function useSaveService(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ input, id }: { input: Omit<CriticalService, 'id' | 'organizationId'>; id?: Id }) => api.assets.saveService(org, input, id),
    onSuccess: () => invalidate('services', 'audit'),
  })
}

export function useDeleteService(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => api.assets.deleteService(org, id), onSuccess: () => invalidate('services', 'audit') })
}

export function useAssignTask(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (input: TaskInput) => api.assets.assignTask(org, input), onSuccess: () => invalidate('tasks', 'audit') })
}

export function useCompleteTask(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => api.assets.completeTask(org, id), onSuccess: () => invalidate('tasks', 'audit') })
}

export function useSaveRisk(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ input, id }: { input: RiskInput; id?: Id }) => api.assets.saveRisk(org, input, id),
    onSuccess: () => invalidate('risks', 'links', 'audit'),
  })
}

export function useAddComment(org: Id, assetId: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (body: string) => api.assets.addComment(org, assetId, body), onSuccess: () => invalidate('comments', 'audit') })
}

export function useProposeAction(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (input: ProposeActionInput) => api.assessment.proposeAction(org, input), onSuccess: () => invalidate('actions', 'audit') })
}

export function useValidateRoadmap(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: () => api.assessment.validateRoadmap(org), onSuccess: () => invalidate('roadmap', 'portfolio', 'audit', 'risks', 'links') })
}

export const useNotifications = () => useQuery({ queryKey: keys.notifications(), queryFn: () => api.notifications.list() })
export const useToday = () => useQuery({ queryKey: keys.today(), queryFn: () => api.directory.getToday(), staleTime: Infinity })

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: Id) => api.notifications.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications() }) })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => api.notifications.markAllRead(), onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications() }) })
}

export function useUpdateTask(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ id, change }: { id: Id; change: { dueDate?: string; status?: 'cancelada' } }) => api.assets.updateTask(org, id, change), onSuccess: () => invalidate('tasks', 'audit') })
}

export function useRemindTask(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => api.assets.remindTask(org, id), onSuccess: () => invalidate('audit') })
}

export function useImportAssets(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (inputs: AssetInput[]) => api.assets.importAssets(org, inputs), onSuccess: () => invalidate('assets', 'audit') })
}

export function useBulkUpdateAssets(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ ids, change }: { ids: Id[]; change: AssetBulkChange }) => api.assets.bulkUpdateAssets(org, ids, change), onSuccess: () => invalidate('assets', 'audit') })
}

export function useBulkDeleteAssets(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (ids: Id[]) => api.assets.bulkDeleteAssets(org, ids), onSuccess: () => invalidate('assets', 'audit', 'risks') })
}

export function useSetRiskStatus(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ id, change }: { id: Id; change: RiskStatusChange }) => api.assets.setRiskStatus(org, id, change), onSuccess: () => invalidate('risks', 'audit') })
}

const INTEGRATION_KEYS = ['integrations', 'discoveries', 'evidence', 'tasks', 'audit', 'assets'] as const

export function useConnectIntegration(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (p: ProviderId) => api.integrations.connect(org, p), onSuccess: () => invalidate(...INTEGRATION_KEYS) })
}

export function useSyncIntegration(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (p: ProviderId) => api.integrations.sync(org, p), onSuccess: () => invalidate(...INTEGRATION_KEYS) })
}

export function useDisconnectIntegration(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (p: ProviderId) => api.integrations.disconnect(org, p), onSuccess: () => invalidate(...INTEGRATION_KEYS) })
}

export function useAssignIntegration(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ provider, userId }: { provider: ProviderId; userId: Id }) => api.integrations.assign(org, provider, userId), onSuccess: () => invalidate(...INTEGRATION_KEYS) })
}

export function useDecideDiscovery(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ id, decision }: { id: Id; decision: DiscoveryDecision }) => api.integrations.decide(org, id, decision), onSuccess: () => invalidate(...INTEGRATION_KEYS) })
}

export function useAnswerQuestion(org: Id) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ taskId, answer }: { taskId: Id; answer: QuestionAnswer }) => api.assessment.answerQuestion(org, taskId, answer), onSuccess: () => invalidate('tasks', 'assessment', 'audit') })
}
