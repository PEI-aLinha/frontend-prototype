/* Tipos partilhados pelo ChatWidget e pelas suas partes. */

export type ChatSource = { label: string; title: string; to: string; cta?: string }

export type ChatMessage = {
  id: string
  role: 'user' | 'bot' | 'notice'
  authorId?: string
  text: string
  source?: ChatSource
  error?: boolean
  createdAt?: string
}

export type BotReplyObject = { text: string; source?: ChatSource; notice?: string }
export type BotReply = string | BotReplyObject

export type Suggestion = {
  label: string
  /** Resumo curto mostrado no separador da conversa. Se omitido, deriva-se da 1.ª pergunta. */
  topic?: string
  /** Se definido, aparece um aviso na conversa depois da resposta do bot. */
  notice?: string
}

export type Conversation = {
  id: string
  messages: ChatMessage[]
  draft: string
  typing: boolean
  unread: boolean
  awaitingReview: boolean
  /** Resumo do tema, mostrado no separador / barra lateral. */
  topic?: string
  createdAt?: string
  /** `updatedAt` da versão do servidor que esta conversa reflete (para saber quando voltar a sincronizar). */
  serverUpdatedAt?: string
}

/** IDs únicos entre utilizadores e sessões (os contadores locais colidiam). */
export const newChatId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID()}`;