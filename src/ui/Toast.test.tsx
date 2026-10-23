import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Trigger({ message, tone }: { message: string; tone?: 'success' | 'error' }) {
  const toast = useToast()
  return <button onClick={() => toast.show(message, tone)}>show</button>
}

function renderToast(message: string, tone?: 'success' | 'error') {
  render(<ToastProvider><Trigger message={message} tone={tone} /></ToastProvider>)
  fireEvent.click(screen.getByText('show'))
}

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('announces success politely and dismisses it after a few seconds', () => {
    renderToast('Ativo guardado')
    expect(screen.getByRole('status')).toHaveTextContent('Ativo guardado')
    act(() => { vi.advanceTimersByTime(5000) })
    expect(screen.queryByText('Ativo guardado')).not.toBeInTheDocument()
  })

  it('keeps errors as an alert until they are closed', () => {
    renderToast('Não foi possível guardar', 'error')
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível guardar')
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
