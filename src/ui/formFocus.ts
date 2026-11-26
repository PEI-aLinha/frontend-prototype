/** Brings the first problem in a form into view and focus: a field marked invalid, or else an error message. */
export function focusFirstInvalid(formId: string) {
  window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(`#${formId} [aria-invalid="true"], #${formId} [role="alert"]`)
    if (!target) return
    if (target.getAttribute('role') === 'alert') target.tabIndex = -1
    target.scrollIntoView({ block: 'center' })
    target.focus({ preventScroll: true })
  })
}
