import type { ChatApi, ChatConversation, ChatMessageInput, DemoActor, Id } from '../contracts'
import { getState, newId, now, setState, simulate } from './store'

export function createChatMock(getActor: () => DemoActor): ChatApi {
  return {
    list: (scopeKey) => simulate(() => getState().chat
      .filter((conversation) => conversation.scopeKey === scopeKey && conversation.userId === getActor().userId)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))),

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
      setState((state) => ({
        ...state,
        chat: state.chat.some((item) => item.id === saved.id)
          ? state.chat.map((item) => item.id === saved.id ? saved : item)
          : [...state.chat, saved],
      }))
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