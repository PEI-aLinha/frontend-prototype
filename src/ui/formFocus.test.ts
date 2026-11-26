import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusFirstInvalid } from './formFocus'

describe('focusFirstInvalid', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0 })
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('focuses the first field marked invalid', () => {
    document.body.innerHTML = '<form id="f"><input id="a" /><input id="b" aria-invalid="true" /><p role="alert">Erro</p></form>'
    focusFirstInvalid('f')
    expect(document.activeElement?.id).toBe('b')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })

  it('falls back to the error message and makes it focusable', () => {
    document.body.innerHTML = '<form id="f"><input /><p role="alert" id="msg">Erro</p></form>'
    focusFirstInvalid('f')
    const msg = document.getElementById('msg')!
    expect(msg.tabIndex).toBe(-1)
    expect(document.activeElement).toBe(msg)
  })

  it('does nothing when the form has no problem', () => {
    document.body.innerHTML = '<form id="f"><input /></form>'
    focusFirstInvalid('f')
    expect(document.activeElement).toBe(document.body)
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })
})
