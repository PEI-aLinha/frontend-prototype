import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import * as RSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from './cn'
import { controlClass } from './controlClass'

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  /** `required` is true unless the field is optional: pass it on as aria-required (WCAG 3.3.2). */
  children: (props: { id: string; describedBy?: string; invalid: boolean; required: boolean }) => ReactNode
  className?: string
}

/** Etiqueta SemiBold 13 ink-soft por cima (gap 6), ajuda e erro por baixo. */
export function Field({ label, hint, error, optional, children, className }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink-soft">
        {label}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      {children({ id, describedBy, invalid: !!error, required: !optional })}
      {hint && !error && <p id={hintId} className="text-[0.8125rem] text-muted">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-[0.8125rem] font-semibold text-danger">{error}</p>}
    </div>
  )
}


export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function TextInput({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass(invalid), className)} {...rest} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function TextArea({ invalid, className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(controlClass(invalid), 'resize-y leading-[1.45]', className)} {...rest} />
})

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

interface SelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  ariaLabel?: string
  size?: 'md' | 'sm'
  disabled?: boolean
  required?: boolean
}

export function Select({ id, value, onChange, options, placeholder = 'Escolher…', invalid, describedBy, ariaLabel, size = 'md', disabled, required }: SelectProps) {
  return (
    <RSelect.Root value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <RSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        className={cn(controlClass(invalid, size), 'flex items-center justify-between gap-2 text-left data-[placeholder]:text-muted [&>span]:truncate')}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="size-4 text-ink-soft" aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content position="popper" sideOffset={6} className="z-[80] max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[12px] border border-line-soft bg-paper shadow-[0_12px_32px_rgb(var(--shadow-rgb)/0.14)] animate-pop-in">
          <RSelect.Viewport className="p-1.5">
            {options.map((o) => (
              <RSelect.Item key={o.value} value={o.value} className="flex cursor-pointer items-start gap-2 rounded-[8px] px-3 py-2 text-[0.875rem] text-ink outline-none data-[highlighted]:bg-paper-soft data-[state=checked]:font-bold data-[state=checked]:text-brand">
                <span className="flex-1">
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                  {o.hint && <span className="block text-[0.75rem] font-normal text-muted">{o.hint}</span>}
                </span>
                <RSelect.ItemIndicator>
                  <Check className="mt-0.5 size-4" aria-hidden />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}
