import { newChatId, type ChatAttachment } from './ChatTypes'

// Mockup: o protótipo não tem armazenamento de ficheiros. O ficheiro anexado fica em memória
// (até recarregar a página) para que "abrir" funcione; a conversa guarda só os metadados.
// No produto real o ficheiro vai para o armazenamento de objetos (MinIO).
const urls = new Map<string, string>()

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg'

export function keepAttachment(file: File): ChatAttachment {
  const attachment = { id: newChatId('doc'), name: file.name, size: file.size, type: file.type }
  urls.set(attachment.id, URL.createObjectURL(file))
  return attachment
}

/** URL do ficheiro em memória, se ainda existir nesta sessão. */
export const attachmentUrl = (id: string): string | null => urls.get(id) ?? null

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
