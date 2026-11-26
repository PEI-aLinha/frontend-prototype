import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GlossaryText } from './GlossaryText'

afterEach(cleanup)

describe('GlossaryText', () => {
  it('explains each known abbreviation once and keeps the text whole', () => {
    const { container } = render(<p><GlossaryText>Implementar MFA nos acessos remotos e MFA nas contas de administração</GlossaryText></p>)
    expect(screen.getAllByRole('button', { name: 'MFA' })).toHaveLength(1)
    expect(container.textContent).toBe('Implementar MFA nos acessos remotos e MFA nas contas de administração')
  })

  it('leaves text without known terms untouched', () => {
    render(<p><GlossaryText>Criar política de cópias de segurança</GlossaryText></p>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
