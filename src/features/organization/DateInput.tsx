import { forwardRef, useImperativeHandle, useRef, type InputHTMLAttributes } from 'react'
import { CalendarDays } from 'lucide-react'
import { TextInput, cn } from '../../ui'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }

/** Chrome/Edge: the native icon is stretched (invisible) over the whole field, so a click opens the browser's own calendar. */
const NATIVE_OVERLAY = typeof CSS !== 'undefined' && CSS.supports('selector(::-webkit-calendar-picker-indicator)')

function showPicker(input: HTMLInputElement | null) {
  try {
    input?.showPicker?.()
  } catch {
    // Some browsers only allow it in certain contexts: the field still accepts typing.
  }
}

/**
 * Date field with a single calendar icon that opens the calendar on a click anywhere.
 * - Chrome/Edge: the native icon covers the field invisibly and ours is decoration underneath. Clicks are left to the
 *   browser: calling showPicker() on top of them closed the calendar it had just opened.
 * - Safari: no native icon; ours and the field call showPicker().
 * - Firefox: its own icon cannot be hidden, so ours is hidden.
 */
export const DateInput = forwardRef<HTMLInputElement, Props>(function DateInput({ className, onClick, onKeyDown, ...rest }, ref) {
  const input = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => input.current!)
  return (
    <div className="relative">
      <TextInput ref={input} type="date"
        className={cn(
          'relative cursor-pointer pr-12',
          '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
          className,
        )}
        onClick={(e) => { if (!NATIVE_OVERLAY) showPicker(e.currentTarget); onClick?.(e) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPicker(e.currentTarget) } onKeyDown?.(e) }}
        {...rest} />
      <button type="button" tabIndex={-1} onClick={() => { input.current?.focus(); showPicker(input.current) }} aria-label="Abrir calendário"
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[8px] text-ink-soft hover:bg-paper-soft hover:text-ink supports-[-moz-appearance:none]:hidden supports-[selector(::-webkit-calendar-picker-indicator)]:pointer-events-none">
        <CalendarDays className="size-4" aria-hidden />
      </button>
    </div>
  )
})
