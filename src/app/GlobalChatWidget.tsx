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
    { label: 'Quais são os prazos legais se sofrermos um ciberataque?', topic: 'Prazos legais' },
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
      table: message.table,
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
    // Dono no servidor: o widget compara com o senderId para saber se a consultora está a rever um cliente
    ownerId: saved.userId,
  }
}

function toStoredConversation(conversation: Conversation, scopeKey: string): ChatConversation {
  const timestamp = new Date().toISOString()
  return {
    id: conversation.id,
    scopeKey,
    userId: '', // o servidor define-o a partir da sessão (e preserva o dono original)
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      authorId: message.authorId,
      text: message.text,
      source: message.source,
      table: message.table,
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

  // A IA responde a toda a gente nas conversas próprias, incluindo a consultora.
  // (Quando a consultora responde a um cliente, o ChatWidget nem chama o onSend.)
  const handleSend = useCallback((_text: string, messages: ChatMessage[]) => sendMessage({
    messages: messages
      .filter((message) => message.role !== 'notice')
      .map(({ role, text }) => ({ role: role as 'user' | 'bot', text })),
  }), [sendMessage])
  const handleSave = useCallback(
    (conversation: Conversation) => saveConversation(toStoredConversation(conversation, scopeKey)).then(() => undefined),
    [saveConversation, scopeKey],
  )
  // O servidor só apaga conversas de que o utilizador é dono: fechar uma conversa de cliente é só local.
  const handleDelete = useCallback(
    (id: string) => deleteConversation(id).then(() => undefined),
    [deleteConversation],
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
      senderId={persona.userId}
    />
  )
}