import { useCallback } from 'react'
import { useLocation } from 'react-router'
import { useChatHistory, useDeleteChatConversation, useSaveChatConversation, useSendChatMessage } from '../api/queries'
import type { ChatConversation } from '../api/contracts'
import { useSession } from '../core/session'
import { ChatWidget } from '../features/chatbot/ChatWidget'
import type { ChatMessage, Conversation, Suggestion } from '../features/chatbot/ChatTypes'

const PERSONA_SUGGESTIONS: Record<string, Suggestion[]> = {
  rui: [
    {
      label: 'Criar rascunho da política de segurança',
      topic: 'Política de segurança',
    },
    {
      label: 'Quais são as minhas responsabilidades?',
      topic: 'Responsabilidades',
    },
    {
      label: 'Que evidências devo reunir?',
      topic: 'Evidências',
    },
  ],

  pedro: [
    {
      label: 'Que ativos devo registar?',
      topic: 'Registo de ativos',
    },
    {
      label: 'Explicar uma pergunta técnica',
      topic: 'Pergunta técnica',
    },
    {
      label: 'Como identificar ativos críticos?',
      topic: 'Ativos críticos',
    },
  ],

  marta: [
    {
      label: 'Preparar notificação inicial de incidente',
      topic: 'Notificação inicial',
    },
    {
      label: 'Preparar relatório final para a CNPD',
      topic: 'Relatório final CNPD',
    },
    {
      label: 'Que prazos legais devo considerar?',
      topic: 'Prazos de notificação',
    },
  ],
}

function chatScope(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'org' || parts[0] === 'clientes') return `${parts[0]}:${parts[1] ?? 'unknown'}`
  return parts[0] ?? 'global'
}

function numericId(value: string, fallback: number): number {
  const match = value.match(/(\d+)$/)
  if (match) return Number(match[1])
  return fallback
}

function toWidgetConversation(saved: ChatConversation, index: number): Conversation {
  return {
    id: numericId(saved.id, index + 1),
    messages: saved.messages.map((message, messageIndex): ChatMessage => ({
      id: numericId(message.id, messageIndex + 1),
      role: message.role,
      text: message.text,
      source: message.source,
      error: message.error,
    })),
    draft: '',
    typing: false,
    unread: false,
    awaitingReview: saved.awaitingReview,
    topic: saved.topic,
  }
}

function toStoredConversation(conversation: Conversation, scopeKey: string): ChatConversation {
  const timestamp = new Date().toISOString()
  return {
    id: `chat-${conversation.id}`,
    scopeKey,
    userId: '',
    messages: conversation.messages.map((message) => ({
      id: `message-${message.id}`,
      role: message.role,
      text: message.text,
      source: message.source,
      error: message.error,
      createdAt: timestamp,
    })),
    topic: conversation.topic,
    awaitingReview: conversation.awaitingReview,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function GlobalChatWidget() {
  const { pathname } = useLocation()
  const { persona } = useSession()
  const scopeKey = chatScope(pathname)
  const history = useChatHistory(scopeKey)
  const save = useSaveChatConversation(scopeKey)
  const remove = useDeleteChatConversation(scopeKey)
  const send = useSendChatMessage()
  const sendMessage = send.mutateAsync
  const saveConversation = save.mutateAsync
  const deleteConversation = remove.mutateAsync
  const handleSend = useCallback((_text: string, messages: ChatMessage[]) => sendMessage({
    messages: messages
      .filter((message) => message.role !== 'notice')
      .map(({ role, text }) => ({ role: role as 'user' | 'bot', text })),
  }), [sendMessage])
  const handleSave = useCallback(
    (conversation: Conversation) => saveConversation(toStoredConversation(conversation, scopeKey)).then(() => undefined),
    [saveConversation, scopeKey],
  )
  const handleDelete = useCallback(
    (id: number) => deleteConversation(`chat-${id}`).then(() => undefined),
    [deleteConversation],
  )

  return (
    <ChatWidget
      key={`${persona.key}-${scopeKey}`}
      suggestions={PERSONA_SUGGESTIONS[persona.key]}
      initialConversations={history.data?.map(toWidgetConversation)}
      loading={history.isPending}
      error={history.error}
      onRetry={history.refetch}
      onSend={handleSend}
      onSaveConversation={handleSave}
      onDeleteConversation={handleDelete}
    />
  )
}
