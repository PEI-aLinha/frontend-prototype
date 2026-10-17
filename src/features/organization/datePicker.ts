/** Opens the browser's calendar when a date field is clicked, not only on the small icon. */
export function openPicker(input: HTMLInputElement) {
  try {
    input.showPicker?.()
  } catch {
    // Some browsers only allow it in certain contexts: the field still accepts typing.
  }
}
