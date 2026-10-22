import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasSeenTour, markTourSeen, resolveSteps, shouldAutoStart } from './tourState'

const q = (s: string) => new URLSearchParams(s)

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('shouldAutoStart', () => {
  it('starts on the first visit', () => {
    expect(shouldAutoStart('riscos', q(''), false)).toBe(true)
  })

  it('does not start again once seen', () => {
    markTourSeen('riscos')
    expect(shouldAutoStart('riscos', q(''), false)).toBe(false)
  })

  it('does not start on top of an open drawer or modal', () => {
    expect(shouldAutoStart('riscos', q('risco=r1'), false)).toBe(false)
    expect(shouldAutoStart('ativos', q('novo=1'), false)).toBe(false)
  })

  it('does not start in automated browsers unless forced', () => {
    expect(shouldAutoStart('riscos', q(''), true)).toBe(false)
    expect(shouldAutoStart('riscos', q('tour=1'), true)).toBe(true)
  })

  it('respects tour=0 even on the first visit', () => {
    expect(shouldAutoStart('riscos', q('tour=0'), false)).toBe(false)
  })
})

describe('tour storage', () => {
  it('treats the tour as seen when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(hasSeenTour('x')).toBe(true)
  })

  it('does not throw when it cannot persist', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => markTourSeen('x')).not.toThrow()
  })
})

describe('resolveSteps', () => {
  it('keeps centred steps and visible anchors, drops missing or hidden ones', () => {
    document.body.innerHTML = '<div data-tour="a">A</div><div data-tour="b" hidden>B</div>'
    const a = document.querySelector<HTMLElement>('[data-tour="a"]')!
    // jsdom has no layout: report a box only for the visible anchor.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return (this === a ? [{}] : []) as unknown as DOMRectList
    })
    const steps = resolveSteps([
      { title: 'Intro', intro: 'centred' },
      { target: 'a', title: 'A', intro: 'a' },
      { target: 'b', title: 'B', intro: 'b' },
      { target: 'missing', title: 'M', intro: 'm' },
    ])
    expect(steps.map((s) => s.title)).toEqual(['Intro', 'A'])
    expect(steps[1].element).toBe(a)
  })
})
