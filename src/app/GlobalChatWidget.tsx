import { useCallback } from 'react'
import { useLocation } from 'react-router'
import { useChatHistory, useDeleteChatConversation, useReviewChatConversation, useSaveChatConversation, useSendChatMessage } from '../api/queries'
import type { ChatConversation } from '../api/contracts'
import { useSession } from '../core/session'
import { ChatWidget } from '../features/chatbot/ChatWidget'
import type { ChatMessage, Conversation, Suggestion } from '../features/chatbot/ChatTypes'

const PERSONA_SUGGESTIONS: Record<string, Suggestion[]> = {
  rui: [
    { label: 'Criar rascunho da política de segurança', topic: 'Política de segurança' },
    { label: 'Quais são as minhas responsabilidades?', topic: 'Responsabilidades' },
    { label: 'Que evidências devo reunir?', topic: 'Evidências' },
  ],
  pedro: [
    { label: 'Que ativos devo registar?', topic: 'Registo de ativos' },
    { label: 'Explicar uma pergunta técnica', topic: 'Pergunta técnica' },
    { label: 'Como identificar ativos críticos?', topic: 'Ativos críticos' },
  ],
  marta: [],
}

/** `/org/x` (cliente) e `/clientes/x` (consultora) têm de partilhar a mesma chave. */
function chatScope(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'org' || parts[0] === 'clientes') return `org:${parts[1] ?? 'unknown'}`
  return parts[0] ?? 'global'
}

function toWidgetConversation(saved: ChatConversation): Conversation {
  return {
    id: saved.id,
    messages: saved.messages.map((message): ChatMessage => ({
      id: message.id,
      role: message.role,
      authorId: message.authorId,
      text: message.text,
      source: message.source,
      error: message.error,
      createdAt: message.createdAt,
    })),
    draft: '',
    typing: false,
    unread: false,
    awaitingReview: saved.awaitingReview,
    topic: saved.topic,
    createdAt: saved.createdAt,
    serverUpdatedAt: saved.updatedAt,
  }
}

function toStoredConversation(conversation: Conversation, scopeKey: string): ChatConversation {
  const timestamp = new Date().toISOString()
  return {
    id: conversation.id,
    scopeKey,
    userId: '', // o servidor define-o a partir da sessão
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      authorId: message.authorId,
      text: message.text,
      source: message.source,
      error: message.error,
      createdAt: message.createdAt ?? timestamp,
    })),
    topic: conversation.topic,
    awaitingReview: conversation.awaitingReview,
    createdAt: conversation.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export function GlobalChatWidget() {
  const { pathname, search } = useLocation()
  const { persona } = useSession()
  const scopeKey = chatScope(pathname)
  const history = useChatHistory(scopeKey, persona.userId)
  const save = useSaveChatConversation(scopeKey, persona.userId)
  const remove = useDeleteChatConversation(scopeKey, persona.userId)
  const review = useReviewChatConversation(scopeKey, persona.userId)
  const send = useSendChatMessage()
  const params = new URLSearchParams(search)
  const notificationConversationId = params.get('chat')
  const openFromNotification = params.has('chat')
  const isConsultant = persona.role === 'consultor'
  const sendMessage = send.mutateAsync
  const saveConversation = save.mutateAsync
  const deleteConversation = remove.mutateAsync
  const reviewConversation = review.mutateAsync

  const handleSend = useCallback((_text: string, messages: ChatMessage[]) => isConsultant
    ? Promise.resolve(null)
    : sendMessage({
      messages: messages
        .filter((message) => message.role !== 'notice')
        .map(({ role, text }) => ({ role: role as 'user' | 'bot', text })),
    }), [isConsultant, sendMessage])
  const handleSave = useCallback(
    (conversation: Conversation) => saveConversation(toStoredConversation(conversation, scopeKey)).then(() => undefined),
    [saveConversation, scopeKey],
  )
  // A consultora não é dona das conversas: fechar o separador é só local.
  const handleDelete = useCallback(
    (id: string) => isConsultant ? Promise.resolve() : deleteConversation(id).then(() => undefined),
    [deleteConversation, isConsultant],
  )
  const handleReview = useCallback((id: string) => reviewConversation(id).then(() => undefined), [reviewConversation])
  const needsReview = useCallback((text: string) => !isConsultant && /rascunho|política|incidente|notificação|CNPD|relatório/i.test(text), [isConsultant])

  return (
    <ChatWidget
      key={`${persona.key}-${scopeKey}-${notificationConversationId ?? ''}`}
      suggestions={PERSONA_SUGGESTIONS[persona.key]}
      defaultOpen={openFromNotification}
      initialConversations={history.data?.map(toWidgetConversation)}
      initialConversationId={notificationConversationId ?? undefined}
      loading={history.isPending}
      error={history.error}
      onRetry={history.refetch}
      onSend={handleSend}
      onSaveConversation={handleSave}
      onDeleteConversation={handleDelete}
      reviewOnReply={needsReview}
      canReview={isConsultant}
      onReview={handleReview}
      senderRole={isConsultant ? 'bot' : 'user'}
      senderId={persona.userId}
    />
  )
}