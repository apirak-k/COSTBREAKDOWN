type EditableTextControl = HTMLInputElement | HTMLTextAreaElement

const selectableInputTypes = new Set(['email', 'password', 'search', 'tel', 'text', 'url'])

const getEditableTextControl = (target: EventTarget | null): EditableTextControl | null => {
  if (target instanceof HTMLTextAreaElement) {
    return target.disabled || target.readOnly ? null : target
  }

  if (!(target instanceof HTMLInputElement) || !selectableInputTypes.has(target.type)) return null
  return target.disabled || target.readOnly ? null : target
}

/** Select a text editor's current value when it first receives focus. */
export const installSelectAllOnFirstFocus = (documentNode: Document): (() => void) => {
  let pointerFocusedControl: EditableTextControl | null = null

  const selectAll = (target: EventTarget | null) => getEditableTextControl(target)?.select()

  const handleFocusIn = (event: FocusEvent) => selectAll(event.target)
  const handlePointerDown = (event: PointerEvent) => {
    const control = getEditableTextControl(event.target)
    pointerFocusedControl = control && documentNode.activeElement !== control ? control : null
  }
  const handleClick = (event: MouseEvent) => {
    // A pointer's first click focuses the control, but the browser applies its
    // normal caret placement afterward. Select again at click capture so that
    // first-focus selection wins; later clicks keep their normal caret behavior.
    if (event.detail > 0 && pointerFocusedControl === event.target) selectAll(pointerFocusedControl)
    pointerFocusedControl = null
  }
  const clearPointerFocus = () => { pointerFocusedControl = null }

  documentNode.addEventListener('focusin', handleFocusIn, true)
  documentNode.addEventListener('pointerdown', handlePointerDown, true)
  documentNode.addEventListener('pointercancel', clearPointerFocus, true)
  documentNode.addEventListener('click', handleClick, true)

  return () => {
    documentNode.removeEventListener('focusin', handleFocusIn, true)
    documentNode.removeEventListener('pointerdown', handlePointerDown, true)
    documentNode.removeEventListener('pointercancel', clearPointerFocus, true)
    documentNode.removeEventListener('click', handleClick, true)
  }
}
