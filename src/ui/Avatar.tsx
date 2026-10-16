import { cn } from './cn'

interface AvatarProps {
  initials: string
  size?: 24 | 28 | 36 | 40 | 44
  tone?: 'soft' | 'dark'
  label?: string
}

export function Avatar({ initials, size = 36, tone = 'soft', label }: AvatarProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none',
        size >= 40 ? 'text-[15px]' : size <= 28 ? 'text-[11px]' : 'text-[12px]',
        tone === 'dark' ? 'bg-brand-deep text-white' : 'bg-brand-soft text-brand',
      )}
    >
      {initials}
    </span>
  )
}

export function Person({ initials, name }: { initials: string; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar initials={initials} size={24} />
      <span className="truncate text-[14px]">{name}</span>
    </span>
  )
}
