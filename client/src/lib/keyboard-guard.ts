const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'

const INTERACTIVE_ANCESTOR_SELECTOR =
  'button, a[href], [role="button"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="slider"], [role="menu"], [role="dialog"]'

function asHTMLElement(node: EventTarget | null | undefined): HTMLElement | null {
  if (!node || typeof node !== "object" || !("tagName" in node)) {
    return null
  }

  return node as HTMLElement
}

/**
 * Returns true when the element is (or is inside) a text entry control.
 */
export function isTextEntryElement(element: Element | null | undefined): boolean {
  const el = asHTMLElement(element)
  if (!el) {
    return false
  }

  const tagName = el.tagName
  if (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    el.isContentEditable
  ) {
    return true
  }

  return Boolean(el.closest(TEXT_ENTRY_SELECTOR))
}

/**
 * Suppress global keyboard shortcuts while the user is typing or interacting
 * with another focusable control. Checks `document.activeElement` first so
 * shortcuts do not fire when a comment field (or any input) has focus even if
 * the keydown event target differs.
 */
export function shouldSuppressGlobalShortcut(
  event: Pick<KeyboardEvent, "target">,
  activeElement: Element | null = typeof document !== "undefined"
    ? document.activeElement
    : null,
): boolean {
  if (isTextEntryElement(activeElement)) {
    return true
  }

  const target = asHTMLElement(event.target)
  if (!target) {
    return false
  }

  if (isTextEntryElement(target)) {
    return true
  }

  return Boolean(target.closest(INTERACTIVE_ANCESTOR_SELECTOR))
}
