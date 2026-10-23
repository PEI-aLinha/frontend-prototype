/* Tipos partilhados pelo ChatWidget e pelas suas partes. */

export type ChatSource = { label: string; title: string; to: string; cta?: string }

/** Tabela devolvida pelo assistente (renderizada como <table> no chat). */
export type ChatTable = { caption?: string; columns: string[]; rows: string[][] }

/** Documento anexado a uma mensagem. No protótipo só guardamos os metadados; o ficheiro fica em memória (ver attachmentStore). */
export type ChatAttachment = { id: string; name: string; size: number; type: string }

/** Pedido de documento feito pela consultora numa conversa de cliente. */
export type ChatDocumentRequest = {
  title: string
  /** Preenchido quando o cliente envia o documento: id da mensagem com o anexo. */
  fulfilledBy?: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'bot' | 'notice'
  authorId?: string
  text: string
  source?: ChatSource
  table?: ChatTable
  attachments?: ChatAttachment[]
  documentRequest?: ChatDocumentRequest
  error?: boolean
  createdAt?: string
}

export type BotReplyObject = { text: string; source?: ChatSource; table?: ChatTable; notice?: string }
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
  /** O utilizador escolheu o nome: o resumo automático deixa de o substituir. */
  topicRenamed?: boolean
  createdAt?: string
  /** `updatedAt` da versão do servidor que esta conversa reflete (para saber quando voltar a sincronizar). */
  serverUpdatedAt?: string
  /**
   * Dono da conversa no servidor (ChatConversation.userId).
   * Se for diferente do utilizador atual (senderId), é uma conversa de cliente que a consultora está a rever.
   * Conversas novas e ainda não guardadas não têm ownerId: são sempre "próprias".
   */
  ownerId?: string
}

/** IDs únicos entre utilizadores e sessões (os contadores locais colidiam). */
export const newChatId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID()}`