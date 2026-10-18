import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { TextInput, cn } from '../../../ui'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }

/** Password field with its own show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput({ className, ...rest }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <TextInput ref={ref} type={show ? 'text' : 'password'} className={cn('pr-12', className)} {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'} aria-pressed={show} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[8px] text-ink-soft hover:bg-paper-soft hover:text-ink">
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
})
