import { Pencil, Plus, X } from 'lucide-react'
import { ChatThread } from './ChatThread'
import {
  ConversationBadges,
  ConversationTabs,
  RenameField,
  useRename,
  useScrollActiveIntoView,
  type ChatBodyProps,
  type ConversationNavProps,
} from './ChatCompact'

/** Barra lateral com as conversas (ecrãs médios ou maiores). */
function ConversationSidebar({
  conversations,
  activeId,
  canAdd,
  maxConversations,
  onSelect,
  onAdd,
  onClose,
  onRename,
  canRename,
}: ConversationNavProps & { maxConversations: number }) {
  const ref = useScrollActiveIntoView(activeId, conversations.length)
  const rename = useRename(onRename)
  return (
    <aside className="hidden w-[260px] flex-none flex-col gap-3 border-r border-brand-soft bg-paper p-3 md:flex">
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="flex min-h-11 items-center gap-2 rounded-[12px] border border-brand-soft bg-white px-3.5 text-[0.875rem] font-bold text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden />
        Nova conversa
      </button>
      <div ref={ref} role="tablist" aria-orientation="vertical" aria-label="Conversas" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {conversations.map((c) => {
          const selected = c.id === activeId
          const label = c.topic ?? 'Nova conversa'
          const renamable = !!onRename && (canRename?.(c) ?? true)
          if (rename.editingId === c.id) {
            return <RenameField key={c.id} initial={c.topic ?? ''} onDone={rename.done(c.id, c.topic ?? '')} className="min-h-11 w-full flex-none rounded-[10px] px-3" />
          }
          return (
            <div
              key={c.id}
              className={`group flex flex-none items-center rounded-[10px] border ${selected ? 'border-brand-soft bg-white text-brand' : 'border-transparent text-ink-soft hover:bg-paper-soft'}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                title={label}
                onClick={() => onSelect(c.id)}
                onDoubleClick={() => renamable && rename.start(c.id)}
                className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] pl-3 pr-1 text-left text-[0.8125rem] focus-visible:outline-2 focus-visible:outline-brand ${selected ? 'font-bold' : 'font-semibold'}`}
              >
                <span className="truncate">{label}</span>
                <ConversationBadges conversation={c} selected={selected} />
              </button>
              {renamable && (
                <button
                  type="button"
                  onClick={() => rename.start(c.id)}
                  aria-label={`Mudar o nome da conversa ${label}`}
                  title="Mudar o nome"
                  className={`flex size-9 flex-none items-center justify-center rounded-full opacity-0 hover:bg-black/10 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand group-focus-within:opacity-100 group-hover:opacity-100 ${conversations.length > 1 ? '' : 'mr-1'}`}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
              )}
              {conversations.length > 1 && (
                <button
                  type="button"
                  onClick={() => onClose(c.id)}
                  aria-label={`Fechar conversa ${label}`}
                  className="mr-1 flex size-9 flex-none items-center justify-center rounded-full opacity-0 hover:bg-black/10 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand group-focus-within:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {!canAdd && (
        <p className="px-1 text-[0.6875rem] text-muted">Máximo de {maxConversations} conversas. Feche uma para abrir outra.</p>
      )}
    </aside>
  )
}

/** Versão expandida: conversas na barra lateral à esquerda (em ecrãs pequenos volta aos separadores). */
export function ChatExpanded({
  conversation,
  suggestions,
  onSend,
  onDraftChange,
  canReview,
  reviewing,
  onReview,
  onRequestDocument,
  context,
  maxConversations,
  ...nav
}: ChatBodyProps & { maxConversations: number }) {
  return (
    <>
      <div className="md:hidden">
        <ConversationTabs {...nav} />
      </div>
      <div className="flex min-h-0 flex-1">
        <ConversationSidebar {...nav} maxConversations={maxConversations} />
        <ChatThread
          key={conversation.id}
          conversation={conversation}
          expanded
          suggestions={suggestions}
          onSend={onSend}
          onDraftChange={onDraftChange}
          canReview={canReview}
          reviewing={reviewing}
          onReview={onReview}
          onRequestDocument={onRequestDocument}
          context={context}
        />
        {context && (
          <aside aria-label="Contexto do cliente" className="hidden w-[280px] flex-none flex-col gap-3 overflow-y-auto border-l border-brand-soft bg-white p-4 xl:flex">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted">Contexto do cliente</span>
            {context}
          </aside>
        )}
      </div>
    </>
  )
}