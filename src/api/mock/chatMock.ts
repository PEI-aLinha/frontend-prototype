import { ApiError, type ChatApi, type ChatConversation, type ChatMessageInput, type DemoActor, type Id } from '../contracts'
import { getState, newId, now, setState, simulate } from './store'
import { notify } from './notify'

export function createChatMock(getActor: () => DemoActor): ChatApi {
  return {
    list: (scopeKey) => simulate(() => {
      const actorId = getActor().userId
      const isConsultant = getState().users.find((user) => user.id === actorId)?.role === 'consultor'
      return getState().chat
        .filter((c) => c.scopeKey === scopeKey && (isConsultant
          ? c.awaitingReview || c.reviewedMessageCount !== undefined
          : c.userId === actorId))
        // Conversa já revista: a consultora só vê até ao momento da revisão
        .map((c) => isConsultant && !c.awaitingReview && c.reviewedMessageCount !== undefined
          ? { ...c, messages: c.messages.slice(0, c.reviewedMessageCount) }
          : c)
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    }),

    save: (scopeKey, conversation) => simulate(() => {
      const timestamp = now()
      let result!: ChatConversation
      setState((state) => {
        const actorId = getActor().userId
        const me = state.users.find((user) => user.id === actorId)
        const before = state.chat.find((item) => item.id === conversation.id)
        if (me?.role === 'consultor' && (!before || !before.awaitingReview)) throw new ApiError('Conversa não está pendente de revisão.', 409)
        if (before && me?.role !== 'consultor' && before.userId !== actorId) throw new ApiError('Não tem permissão para esta ação.', 403)

        result = {
          ...conversation,
          id: conversation.id || newId('chat'),
          scopeKey,
          userId: before?.userId ?? actorId, // o dono não muda quando a consultora guarda
          reviewedMessageCount: before?.reviewedMessageCount, // o cliente não o conhece: preservar
          createdAt: before?.createdAt ?? conversation.createdAt ?? timestamp,
          updatedAt: timestamp,
        }
        const next = {
          ...state,
          chat: before ? state.chat.map((item) => item.id === result.id ? result : item) : [...state.chat, result],
        }
        if (!before?.awaitingReview && result.awaitingReview) {
          const orgSlug = scopeKey.replace(/^org:/, '')
          const org = state.organizations.find((item) => item.slug === orgSlug)
          const consultant = state.users.find((user) => user.id === org?.consultantId)
          return consultant && org
            ? notify(next, { organizationId: org.id, userId: consultant.id, kind: 'chat', title: 'Resposta do assistente para rever', body: result.topic ? `Reveja a conversa: ${result.topic}.` : 'Há uma resposta do assistente à sua espera.', link: `/clientes/${orgSlug}/visao-geral?chat=${result.id}` })
            : next
        }
        return next
      })
      return result
    }),

    delete: (scopeKey, conversationId) => simulate(() => {
      setState((state) => ({
        ...state,
        chat: state.chat.filter((conversation) => !(conversation.scopeKey === scopeKey && conversation.id === conversationId && conversation.userId === getActor().userId)),
      }))
    }),

    clear: (scopeKey) => simulate(() => {
      setState((state) => ({
        ...state,
        chat: state.chat.filter((conversation) => !(conversation.scopeKey === scopeKey && conversation.userId === getActor().userId)),
      }))
    }),

    review: (scopeKey, conversationId) => simulate(() => {
      const me = getState().users.find((user) => user.id === getActor().userId)
      if (me?.role !== 'consultor') throw new ApiError('Só a consultora pode rever conversas.', 403)
      let reviewed!: ChatConversation
      setState((state) => {
        const current = state.chat.find((item) => item.id === conversationId && item.scopeKey === scopeKey && item.awaitingReview)
        if (!current) throw new ApiError('Conversa não encontrada ou já revista.', 404)
        const messages = current.messages.filter((message) => message.role !== 'notice')
        reviewed = {
          ...current,
          messages,
          awaitingReview: false,
          reviewedMessageCount: messages.length, // ponto até onde a consultora vê
          updatedAt: now(),
        }
        const next = { ...state, chat: state.chat.map((item) => item.id === conversationId ? reviewed : item) }
        const orgSlug = scopeKey.replace(/^org:/, '')
        const org = state.organizations.find((item) => item.slug === orgSlug)
        return org
          ? notify(next, { organizationId: org.id, userId: current.userId, kind: 'chat', title: 'A sua conversa foi revista', body: current.topic ? `A consultora reviu: ${current.topic}.` : 'A consultora respondeu à sua conversa.', link: `/org/${orgSlug}/inicio?chat=${current.id}` })
          : next
      })
      return reviewed
    }),

    send: (organizationId: Id | undefined, messages: ChatMessageInput[]) =>
      simulate(() => {
        const latest = messages.at(-1)?.text.toLowerCase() ?? ''

        if (latest.includes('roadmap')) {
          return {
            text: 'Posso ajudar a analisar o roadmap da organização.',
            notice: organizationId ? 'Resposta associada à organização atual.' : undefined,
          }
        }

        return { text: 'Resposta de exemplo devolvida pela API do assistente.' }
      }),
  }
}