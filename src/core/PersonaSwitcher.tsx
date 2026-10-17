import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, ChevronUp, FlaskConical, RotateCcw, UserPlus, WifiOff } from 'lucide-react'
import { isFailureMode, resetDemo, setFailureMode, SNAPSHOTS, type SnapshotId } from '../api/demo'
import { Avatar, cn, useToast } from '../ui'
import { homePath, PERSONAS, type PersonaKey } from './personas'
import { useSession } from './session'
import { DemoGuide, type GuideStep } from './DemoGuide'

const itemCls = 'flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-paper-soft'

/** Unobtrusive persona switcher for the demo (bottom-right corner, or ⌥P / Alt+P). */
export function PersonaSwitcher() {
  const { persona, setPersona } = useSession()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [failing, setFailing] = useState(isFailureMode)
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyP') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const switchTo = (key: PersonaKey) => {
    setPersona(key)
    navigate(homePath(key))
  }

  const jump = (id: SnapshotId) => {
    resetDemo(id)
    qc.clear()
    const target: PersonaKey = id === 'c2' ? 'marta' : 'rui'
    setPersona(target)
    navigate(homePath(target))
    toast.show(`Dados repostos: ${SNAPSHOTS.find((s) => s.id === id)?.label}`)
  }

  const go = (st: GuideStep) => {
    setGuide(false)
    if (st.snapshot) { resetDemo(st.snapshot); qc.clear() }
    setPersona(st.as)
    // After the modal closes, so the click does not land on the target screen.
    window.setTimeout(() => navigate(`${st.path}${st.path.includes('?') ? '&' : '?'}as=${st.as}`), 0)
  }

  const toggleFailure = () => {
    setFailureMode(!failing)
    setFailing(!failing)
    qc.invalidateQueries()
  }

  return (
    <>
    <DemoGuide open={guide} onClose={() => setGuide(false)} onGo={go} />
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        aria-label={`Demonstração: a ver como ${persona.name}. Mudar de persona (Alt+P)`}
        className="fixed bottom-[76px] left-5 z-[85] md:max-w-[192px] flex items-center gap-2 rounded-full border border-line-soft bg-paper/95 py-1.5 pl-1.5 pr-3 text-[12px] font-bold text-ink-soft shadow-[0_6px_20px_rgba(32,33,36,0.12)] backdrop-blur transition-colors hover:text-ink max-md:bottom-[84px] max-md:left-auto max-md:right-3"
      >
        <Avatar initials={persona.initials} size={24} />
        <span className="max-sm:hidden">Demo · {persona.firstName}</span>
        {failing && <WifiOff className="size-3.5 text-danger" aria-label="Modo de erro ativo" />}
        <ChevronUp className="size-3.5" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content side="top" align="start" sideOffset={8} className="z-[95] w-[300px] rounded-[14px] border border-line-soft bg-paper p-1.5 shadow-[0_16px_48px_rgba(32,33,36,0.18)] animate-pop-in">
          <Menu.Label className="eyebrow px-2.5 pb-1 pt-2 text-[10.5px] text-muted">Ver como</Menu.Label>
          {Object.values(PERSONAS).map((p) => (
            <Menu.Item key={p.key} onSelect={() => switchTo(p.key)} className={itemCls}>
              <Avatar initials={p.initials} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{p.name}</span>
                <span className="block truncate text-[12px] text-muted">{p.description}</span>
              </span>
              {p.key === persona.key && <Check className="size-4 text-brand" aria-label="atual" />}
            </Menu.Item>
          ))}
          <Menu.Separator className="my-1.5 h-px bg-line-soft" />
          <Menu.Item onSelect={() => setGuide(true)} className={itemCls}>
            <BookOpen className="size-4 text-brand" aria-hidden />
            <span className="font-bold text-brand">Guião da demonstração</span>
          </Menu.Item>
          <Menu.Item onSelect={() => navigate('/registo/conta')} className={itemCls}>
            <UserPlus className="size-4 text-ink-soft" aria-hidden />
            <span className="min-w-0">
              <span className="block font-semibold">Adesão: criar conta</span>
              <span className="block truncate text-[12px] text-muted">Registo de uma nova organização</span>
            </span>
          </Menu.Item>
          <Menu.Separator className="my-1.5 h-px bg-line-soft" />
          <Menu.Label className="eyebrow px-2.5 pb-1 pt-1 text-[10.5px] text-muted">Saltar para</Menu.Label>
          {SNAPSHOTS.map((s) => (
            <Menu.Item key={s.id} onSelect={() => jump(s.id)} className={itemCls}>
              <FlaskConical className="size-4 shrink-0 text-ink-soft" aria-hidden />
              <span className="min-w-0">
                <span className="block font-semibold">{s.label}</span>
                <span className="block truncate text-[12px] text-muted">{s.hint}</span>
              </span>
            </Menu.Item>
          ))}
          <Menu.Separator className="my-1.5 h-px bg-line-soft" />
          <Menu.Item onSelect={() => jump('c1')} className={itemCls}>
            <RotateCcw className="size-4 text-ink-soft" aria-hidden />
            <span className="font-semibold">Repor dados de demonstração</span>
          </Menu.Item>
          <Menu.CheckboxItem checked={failing} onSelect={(e) => { e.preventDefault(); toggleFailure() }} className={cn(itemCls, failing && 'text-danger')}>
            <WifiOff className="size-4" aria-hidden />
            <span className="flex-1 font-semibold">Simular falha de ligação</span>
            <Menu.ItemIndicator><Check className="size-4" aria-hidden /></Menu.ItemIndicator>
          </Menu.CheckboxItem>
          <p className="px-2.5 pb-1.5 pt-2 text-[11px] text-muted">Atalho: Alt+P. Só existe no protótipo.</p>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
    </>
  )
}
