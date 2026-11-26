import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Field, TextInput } from './Field'

afterEach(cleanup)

describe('Field', () => {
  it('names the control by its label only, with glossary help beside it', () => {
    render(
      <Field label="Ativo afetado" optional term={<button type="button">O que é?</button>}>
        {(p) => <TextInput id={p.id} />}
      </Field>,
    )
    expect(screen.getByRole('textbox', { name: /^Ativo afetado\s*\(opcional\)$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'O que é?' })).toBeInTheDocument()
  })
})

describe('Select inside a Field', () => {
  it('is named by the field label', async () => {
    const { Select } = await import('./Field')
    render(
      <Field label="Ativo afetado" term={<button type="button">O que é?</button>}>
        {(p) => <Select id={p.id} value="" onChange={() => {}} options={[{ value: 'a', label: 'Servidor' }]} />}
      </Field>,
    )
    expect(screen.getByRole('combobox', { name: /^Ativo afetado/ })).toBeInTheDocument()
  })
})
