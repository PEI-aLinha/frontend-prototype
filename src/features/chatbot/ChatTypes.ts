/* Tipos partilhados pelo ChatWidget e pelas suas partes. */

export type ChatSource = { label: string; title: string; to: string; cta?: string }

export type ChatMessage = {
  id: number
  role: 'user' | 'bot' | 'notice'
  text: string
  source?: ChatSource
  error?: boolean
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
  id: number
  messages: ChatMessage[]
  draft: string
  typing: boolean
  unread: boolean
  awaitingReview: boolean
  /** Resumo do tema, mostrado no separador / barra lateral. */
  topic?: string
}