import { useEffect, useRef, useState } from 'react'
import { Clock, Pencil, Plus, X } from 'lucide-react'
import { ChatThread } from './ChatThread'
import type { SendOptions } from './ChatThread'
import type { Conversation, Suggestion } from './ChatTypes'

export type ConversationNavProps = {
  conversations: Conversation[]
  activeId: string
  canAdd: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onClose: (id: string) => void
  /** Muda o nome da conversa (vazio volta ao nome automático). */
  onRename?: (id: string, name: string) => void
  /** Se a conversa pode mudar de nome (não pode quando é de um cliente que a consultora está a rever). */
  canRename?: (conversation: Conversation) => boolean
}

export type ChatBodyProps = ConversationNavProps & {
  /** Conversa ativa. */
  conversation: Conversation
  suggestions: Suggestion[]
  onSend: (text: string, from?: Suggestion, options?: SendOptions) => void
  onDraftChange: (text: string) => void
  canReview?: boolean
  /** A conversa ativa é de um cliente e a consultora está a rever/ajudar. */
  reviewing?: boolean
  onReview?: () => void
  /** Só quando a consultora está a rever: pede um documento ao cliente. */
  onRequestDocument?: (title: string, note: string) => void
}

/** Ícone de "à espera de aprovação" e ponto de "mensagens novas". Partilhado com a barra lateral do modo expandido. */
export function ConversationBadges({ conversation: c, selected }: { conversation: Conversation; selected: boolean }) {
  return (
    <>
      {c.awaitingReview && (
        <>
          <Clock className="size-3.5 flex-none" aria-hidden />
          <span className="sr-only">à espera de aprovação</span>
        </>
      )}
      {c.unread && !selected && (
        <>
          <span className="size-2 flex-none rounded-full bg-red-500" aria-hidden />
          <span className="sr-only">novas mensagens</span>
        </>
      )}
    </>
  )
}

/** Campo para mudar o nome de uma conversa. Enter ou sair do campo guarda; Esc cancela. */
export function RenameField({ initial, onDone, className }: { initial: string; onDone: (name: string | null) => void; className?: string }) {
  const done = useRef(false)
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name)
  }
  return (
    <input
      autoFocus
      defaultValue={initial}
      maxLength={40}
      aria-label="Nome da conversa"
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); finish(e.currentTarget.value) }
        // Esc só cancela a edição: não deixa chegar ao atalho que minimiza o assistente
        if (e.key === 'Escape') { e.stopPropagation(); finish(null) }
      }}
      className={`min-w-0 rounded-[8px] border border-brand bg-white px-2.5 text-[13px] font-bold text-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${className ?? ''}`}
    />
  )
}

/** Estado de edição do nome partilhado pelos separadores e pela barra lateral. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRename(onRename?: (id: string, name: string) => void) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const done = (id: string, current: string) => (name: string | null) => {
    setEditingId(null)
    if (name !== null && name.trim() !== current) onRename?.(id, name)
  }
  return { editingId, start: setEditingId, done }
}

/** Mantém o item ativo visível quando a lista tem scroll. */
// eslint-disable-next-line react-refresh/only-export-components
export function useScrollActiveIntoView(activeId: string, count: number) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const selected = ref.current?.querySelector('[aria-selected="true"]')
    if (selected instanceof HTMLElement && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    }
  }, [activeId, count])
  return ref
}

/** Separadores horizontais. Usados no painel normal e, em ecrãs pequenos, no expandido. */
export function ConversationTabs({ conversations, activeId, canAdd, onSelect, onAdd, onClose, onRename, canRename }: ConversationNavProps) {
  const ref = useScrollActiveIntoView(activeId, conversations.length)
  const rename = useRename(onRename)
  return (
    <div ref={ref} role="tablist" aria-label="Conversas" className="flex items-center gap-1.5 overflow-x-auto border-b border-brand-soft bg-paper px-3 py-2">
      {conversations.map((c) => {
        const selected = c.id === activeId
        const label = c.topic ?? 'Nova conversa'
        const renamable = !!onRename && (canRename?.(c) ?? true)
        if (rename.editingId === c.id) {
          return <RenameField key={c.id} initial={c.topic ?? ''} onDone={rename.done(c.id, c.topic ?? '')} className="h-10 w-[180px] flex-none rounded-full px-3.5" />
        }
        return (
          <div
            key={c.id}
            className={`flex flex-none items-center rounded-full border ${selected ? 'border-brand bg-brand text-white' : 'border-brand-soft bg-white text-brand'}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              title={label}
              onClick={() => onSelect(c.id)}
              onDoubleClick={() => renamable && rename.start(c.id)}
              className={`flex min-h-10 max-w-[170px] min-w-0 items-center gap-1.5 rounded-full pl-3.5 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${conversations.length > 1 || (selected && renamable) ? 'pr-1.5' : 'pr-3.5'}`}
            >
              <span className="truncate">{label}</span>
              <ConversationBadges conversation={c} selected={selected} />
            </button>
            {selected && renamable && (
              <button
                type="button"
                onClick={() => rename.start(c.id)}
                aria-label={`Mudar o nome da conversa ${label}`}
                title="Mudar o nome"
                className={`flex size-9 flex-none items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-brand ${conversations.length > 1 ? '' : 'mr-1'}`}
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            )}
            {conversations.length > 1 && (
              <button
                type="button"
                onClick={() => onClose(c.id)}
                aria-label={`Fechar conversa ${label}`}
                className="mr-1 flex size-9 flex-none items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )
      })}
      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Nova conversa"
          className="flex size-10 flex-none items-center justify-center rounded-full border border-dashed border-brand-soft bg-white text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

/** Versão normal (painel pequeno): separadores no topo e conversa por baixo. */
export function ChatCompact({ conversation, suggestions, onSend, onDraftChange, canReview, reviewing, onReview, onRequestDocument, ...nav }: ChatBodyProps) {
  return (
    <>
      <ConversationTabs {...nav} />
      <div className="flex min-h-0 flex-1">
        <ChatThread
          key={conversation.id}
          conversation={conversation}
          expanded={false}
          suggestions={suggestions}
          onSend={onSend}
          onDraftChange={onDraftChange}
          canReview={canReview}
          reviewing={reviewing}
          onReview={onReview}
          onRequestDocument={onRequestDocument}
        />
      </div>
    </>
  )
}   