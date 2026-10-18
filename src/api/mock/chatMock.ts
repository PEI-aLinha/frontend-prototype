import type { ChatApi, ChatConversation, ChatMessageInput, DemoActor, Id } from '../contracts'
import { getState, newId, now, setState, simulate } from './store'
import { notify } from './notify'

export function createChatMock(getActor: () => DemoActor): ChatApi {
  return {
    list: (scopeKey) => simulate(() => {
      const me = getState().users.find((user) => user.id === getActor().userId)
      return getState().chat
        .filter((conversation) => conversation.scopeKey === scopeKey && (me?.role === 'consultor' ? conversation.awaitingReview : conversation.userId === getActor().userId))
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    }),

    save: (scopeKey, conversation) => simulate(() => {
      const timestamp = now()
      const saved: ChatConversation = {
        ...conversation,
        id: conversation.id || newId('chat'),
        scopeKey,
        userId: getActor().userId,
        updatedAt: timestamp,
        createdAt: conversation.createdAt || timestamp,
      }
      setState((state) => {
        const before = state.chat.find((item) => item.id === saved.id)
        const me = state.users.find((user) => user.id === getActor().userId)
        if (me?.role === 'consultor' && (!before || !before.awaitingReview)) throw new Error('Conversa não está pendente de revisão.')
        const next = {
          ...state,
          chat: state.chat.some((item) => item.id === saved.id)
            ? state.chat.map((item) => item.id === saved.id ? { ...saved, userId: before?.userId ?? saved.userId } : item)
            : [...state.chat, saved],
        }
        if (!before?.awaitingReview && saved.awaitingReview) {
          const orgSlug = scopeKey.replace(/^org:/, '')
          const org = state.organizations.find((item) => item.slug === orgSlug)
          const consultant = state.users.find((user) => user.id === org?.consultantId)
          return consultant ? notify(next, { organizationId: org?.id ?? '', userId: consultant.id, kind: 'chat', title: 'Resposta do assistente para rever', body: saved.topic ? `Reveja a conversa: ${saved.topic}.` : 'Há uma resposta do assistente à sua espera.', link: `/clientes/${orgSlug}?chat=${saved.id}` }) : next
        }
        return next
      })
      return saved
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
      if (me?.role !== 'consultor') throw new Error('Só a consultora pode rever conversas.')
      const current = getState().chat.find((item) => item.id === conversationId && item.scopeKey === scopeKey && item.awaitingReview)
      if (!current) throw new Error('Conversa não encontrada ou já revista.')
      const reviewed = { ...current, awaitingReview: false, updatedAt: now() }
      setState((state) => ({ ...state, chat: state.chat.map((item) => item.id === conversationId ? reviewed : item) }))
      return reviewed
    }),

    send: (organizationId: Id | undefined, messages: ChatMessageInput[]) =>
      simulate(() => {
        const latest = messages.at(-1)?.text.toLowerCase() ?? ''

        if (latest.includes('roadmap')) {
          return {
            text: 'Posso ajudar a analisar o roadmap da organização.',
            notice: organizationId
              ? 'Resposta associada à organização atual.'
              : undefined,
          }
        }

        return {
          text: 'Resposta de exemplo devolvida pela API do assistente.',
        }
      }),
  }
}