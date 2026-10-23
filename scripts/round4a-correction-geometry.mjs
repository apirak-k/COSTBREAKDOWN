/** Browser-side probes use rendered controls and restore the original selection. */
export async function selectionColumnStates() {
  const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const geometry = element => {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
    return { width: rect.width, height: rect.height, center: rect.left + rect.width / 2,
      radius: style.borderRadius, border: style.borderTopWidth, shadow: style.boxShadow }
  }
  const results = []
  for (const initialHeader of document.querySelectorAll('[data-sticky-table-header] button[role="checkbox"]')) {
    if (!initialHeader.getClientRects().length) continue
    const sticky = initialHeader.closest('[data-sticky-table-header]')
    const scope = sticky.closest('section[aria-label$=" rows"]') ?? sticky.parentElement
    const headers = () => scope.querySelector('[data-sticky-table-header] button[role="checkbox"]')
    const rows = () => [...scope.querySelectorAll('tbody tr[data-master-data-row-id], tbody tr[data-candidate-reorder-row]')]
      .map(row => row.querySelector('th:first-child button[aria-pressed], td:first-child button[aria-pressed]')).filter(button => button && !button.disabled)
    const original = rows().map(button => button.getAttribute('aria-pressed') === 'true')
    const label = initialHeader.getAttribute('aria-label')
    const capture = state => ({ state, checked: headers().getAttribute('aria-checked'), header: geometry(headers()), rows: rows().map(geometry) })
    if (headers().getAttribute('aria-checked') !== 'false') { headers().click(); await paint() }
    if (headers().getAttribute('aria-checked') !== 'false') { headers().click(); await paint() }
    const states = [capture('false')]
    if (rows().length > 1) { rows()[0].click(); await paint(); states.push(capture('mixed')) }
    headers().click(); await paint(); states.push(capture('true'))
    headers().click(); await paint()
    for (let index = 0; index < original.length; index++) if (original[index]) { rows()[index].click(); await paint() }
    results.push({ label, states, restored: rows().every((button, index) => (button.getAttribute('aria-pressed') === 'true') === original[index]) })
  }
  return results
}

export function cbdCorrectionGeometry() {
  const bounds = element => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width }
  }
  const totals = [...document.querySelectorAll('[data-cbd-total-annotation]')].map(label => {
    const cell = label.parentElement, numeric = cell.querySelector('[data-numeric-region]'), token = cell.querySelector('[data-numeric-token]'), suffix = cell.querySelector('[data-numeric-suffix]')
    return { label: bounds(label), numeric: bounds(numeric), token: bounds(token), suffix: suffix ? bounds(suffix) : null,
      separate: !numeric.contains(label), cell: bounds(cell), padding: getComputedStyle(cell).paddingLeft }
  })
  const loss = [...document.querySelectorAll('tr[data-candidate-reorder-row] > td:nth-child(6)')]
    .filter(cell => cell.querySelector('[data-numeric-suffix]') && cell.closest('table').querySelector('caption')?.textContent.includes('Bill of Material'))
    .map(cell => ({ token: bounds(cell.querySelector('[data-numeric-token]')), suffix: bounds(cell.querySelector('[data-numeric-suffix]')), cell: bounds(cell) }))
  return { totals, loss }
}
