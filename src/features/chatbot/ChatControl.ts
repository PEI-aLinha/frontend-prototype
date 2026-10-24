/**
 * Controlo externo do ChatWidget (montado uma só vez no layout).
 * Qualquer botão da app (ex.: barra lateral) pode abrir o assistente sem partilhar estado:
 *   openExpandedChat()  -> abre já em ecrã inteiro
 *   openChat()          -> abre no painel normal
 */
export const OPEN_CHAT_EVENT = 'alinha:open-chat'

export type OpenChatOptions = { expanded?: boolean }

export function openChat(options: OpenChatOptions = {}) {
  window.dispatchEvent(new CustomEvent<OpenChatOptions>(OPEN_CHAT_EVENT, { detail: options }))
}

export const openExpandedChat = () => openChat({ expanded: true })