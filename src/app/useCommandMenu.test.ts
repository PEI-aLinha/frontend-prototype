import { act, cleanup, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useCommandMenu } from './useCommandMenu'

const pressK = (init: KeyboardEventInit) => fireEvent.keyDown(window, { key: 'k', ...init })

describe('useCommandMenu', () => {
  afterEach(() => { cleanup(); document.body.innerHTML = '' })

  it('toggles open with Ctrl+K and Cmd+K', () => {
    const { result } = renderHook(() => useCommandMenu())
    expect(result.current.open).toBe(false)
    act(() => { pressK({ ctrlKey: true }) })
    expect(result.current.open).toBe(true)
    act(() => { pressK({ metaKey: true }) })
    expect(result.current.open).toBe(false)
  })

  it('ignores K without a modifier and other keys with one', () => {
    const { result } = renderHook(() => useCommandMenu())
    act(() => { pressK({}) })
    act(() => { fireEvent.keyDown(window, { key: 'j', ctrlKey: true }) })
    expect(result.current.open).toBe(false)
  })

  it('does not open on top of another dialog', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'alertdialog')
    document.body.appendChild(dialog)
    const { result } = renderHook(() => useCommandMenu())
    act(() => { pressK({ ctrlKey: true }) })
    expect(result.current.open).toBe(false)
  })

  it('stops listening once unmounted', () => {
    const { result, unmount } = renderHook(() => useCommandMenu())
    unmount()
    pressK({ ctrlKey: true })
    expect(result.current.open).toBe(false)
  })
})
