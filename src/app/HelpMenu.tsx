import { useState } from 'react'
import { CircleHelp, Mail, Phone } from 'lucide-react'
import { useConsultant } from '../api/queries'
import { useSession } from '../core/session'
import { useOptionalTenant } from '../core/tenant'
import { Modal, TextInput, cn } from '../ui'
import { Kbd } from './CommandMenu'
import { searchGlossary } from './helpSearch'
import { MOD_KEY } from './useCommandMenu'

/** One place to look things up: words, shortcuts, the guided tours and who to ask. */
export function HelpMenu({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" aria-label="Ajuda" onClick={() => setOpen(true)} className={cn('grid place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep/60 hover:text-ink', compact ? 'size-9' : 'size-10')}>
        <CircleHelp className="size-5" aria-hidden />
      </button>
      {open && <HelpDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const terms = searchGlossary(q)
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Ajuda" description="Significado das palavras técnicas, atalhos e a quem perguntar." width={600}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="help-glossary" className="flex flex-col gap-3">
          <h3 id="help-glossary" className="text-[0.9375rem] font-extrabold">Glossário</h3>
          <TextInput type="search" aria-label="Procurar no glossário" placeholder="Ex.: ativo, MFA, NIS2" value={q} onChange={(e) => setQ(e.target.value)} />
          <dl className="flex max-h-[38vh] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
            {terms.length === 0 && <p className="text-sm text-ink-soft">Nenhuma palavra encontrada para “{q}”. Pergunte à sua consultora.</p>}
            {terms.map((e) => (
              <div key={e.term} className="flex flex-col gap-0.5">
                <dt className="text-[0.9375rem] font-bold">{e.term}</dt>
                <dd className="text-sm leading-relaxed text-ink-soft">{e.short}{e.example && <span className="block text-muted">Exemplo: {e.example}</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="help-keys" className="flex flex-col gap-2">
          <h3 id="help-keys" className="text-[0.9375rem] font-extrabold">Atalhos</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2"><Kbd>{MOD_KEY}</Kbd><Kbd>K</Kbd> Procurar páginas, clientes e ações</li>
            <li className="flex items-center gap-2"><Kbd>esc</Kbd> Fechar uma janela ou um painel</li>
          </ul>
        </section>
        <section aria-labelledby="help-tour" className="flex flex-col gap-1">
          <h3 id="help-tour" className="text-[0.9375rem] font-extrabold">Visitas guiadas</h3>
          <p className="text-sm text-ink-soft">Os ecrãs principais têm uma visita guiada. Abra-a de novo no botão «Visita guiada», ao lado do título.</p>
        </section>
        <Contact />
      </div>
    </Modal>
  )
}

function Contact() {
  const { persona } = useSession()
  const org = useOptionalTenant()
  const consultant = useConsultant(persona.role === 'consultor' ? undefined : org?.id)
  const c = consultant.data
  return (
    <section aria-labelledby="help-contact" className="flex flex-col gap-1.5">
      <h3 id="help-contact" className="text-[0.9375rem] font-extrabold">A quem perguntar</h3>
      {persona.role === 'consultor' ? (
        <p className="text-sm text-ink-soft">Dúvidas sobre a plataforma: <a className="font-bold text-brand hover:underline" href="mailto:suporte@alinha.pt">suporte@alinha.pt</a></p>
      ) : c ? (
        <>
          <p className="text-sm text-ink-soft">{c.heading}, {c.name}, responde a dúvidas sobre a avaliação, os riscos e o plano.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline" href={`mailto:${c.email}`}><Mail className="size-4" aria-hidden />{c.email}</a>
            <a className="num inline-flex items-center gap-1.5 font-bold text-brand hover:underline" href={`tel:${c.phone}`}><Phone className="size-4" aria-hidden />{c.phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</a>
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-soft">A sua consultora aparece aqui quando for atribuída.</p>
      )}
    </section>
  )
}
