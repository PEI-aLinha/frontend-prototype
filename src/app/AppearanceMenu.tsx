import * as Popover from '@radix-ui/react-popover'
import { Check, Palette } from 'lucide-react'
import { useAppearance, type ColorVision, type ThemePreference } from '../core/appearance'
import { cn, Segmented } from '../ui'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

const VISION_OPTIONS: { value: ColorVision; label: string; hint: string }[] = [
  { value: 'none', label: 'Padrão', hint: 'Cores originais' },
  { value: 'protanopia', label: 'Protanopia', hint: 'Dificuldade com vermelho' },
  { value: 'deuteranopia', label: 'Deuteranopia', hint: 'Dificuldade com verde' },
  { value: 'tritanopia', label: 'Tritanopia', hint: 'Dificuldade com azul e amarelo' },
]

/** Swatch of the three risk levels, rendered under the given vision mode so each option previews itself. */
function RiskSwatch({ vision }: { vision: ColorVision }) {
  return (
    <span data-cvd={vision} className="flex gap-1" aria-hidden>
      {(['low', 'medium', 'high'] as const).map((l) => (
        <span key={l} className="size-3.5 rounded-full ring-1 ring-line-soft" style={{ background: `var(--color-risk-${l}-ink)` }} />
      ))}
    </span>
  )
}

/** Header tool: theme (system/light/dark) and colour-vision mode. */
export function AppearanceMenu({ compact }: { compact?: boolean }) {
  const { theme, setTheme, cvd, setCvd } = useAppearance()
  return (
    <Popover.Root>
      <Popover.Trigger aria-label="Aparência" className={cn('grid place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep/60 hover:text-ink', compact ? 'size-9' : 'size-10')}>
        <Palette className="size-5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} collisionPadding={12} className="z-[96] flex w-[320px] max-w-[calc(100vw-24px)] flex-col gap-4 rounded-[16px] border border-line-soft bg-paper p-4 shadow-[0_16px_48px_rgb(var(--shadow-rgb)/0.18)] animate-pop-in">
          <div className="flex flex-col gap-2">
            <p id="appearance-theme" className="eyebrow text-[0.6875rem] text-muted">Tema</p>
            <Segmented block labelledBy="appearance-theme" value={theme} onChange={setTheme} options={THEME_OPTIONS} />
          </div>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="eyebrow mb-2 p-0 text-[0.6875rem] text-muted">Visão de cores</legend>
            {VISION_OPTIONS.map((o) => {
              const selected = cvd === o.value
              return (
                <label
                  key={o.value}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-paper-soft',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal',
                    selected && 'bg-brand-soft/60 ring-1 ring-brand/35',
                  )}
                >
                  <input type="radio" name="appearance-cvd" value={o.value} checked={selected} onChange={() => setCvd(o.value)} className="sr-only" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[0.9375rem]', selected ? 'font-extrabold text-brand' : 'font-bold')}>{o.label}</span>
                    <span className="block text-[0.75rem] text-ink-soft">{o.hint}</span>
                  </span>
                  <RiskSwatch vision={o.value} />
                  <Check className={cn('size-4 text-brand', !selected && 'invisible')} aria-hidden />
                </label>
              )
            })}
          </fieldset>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
