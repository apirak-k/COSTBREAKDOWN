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
    const cell = label.closest('td, [role="cell"]'), numeric = cell?.querySelector('[data-numeric-region]'), token = cell?.querySelector('[data-numeric-token]'), suffix = cell?.querySelector('[data-numeric-suffix]')
    return { label: bounds(label), numeric: numeric ? bounds(numeric) : null, token: token ? bounds(token) : null, suffix: suffix ? bounds(suffix) : null,
      separate: Boolean(token && !token.contains(label)), cell: cell ? bounds(cell) : null, padding: cell ? getComputedStyle(cell).paddingLeft : '0px' }
  })
  const bomTables = [...document.querySelectorAll('table')]
    .filter(table => table.querySelector('caption')?.textContent.includes('Bill of Material'))
  const lossMetric = cell => {
    if (!cell) return null
    const token = cell.querySelector('[data-numeric-token]')
    const suffix = cell.querySelector('[data-numeric-suffix]')
    const numeric = cell.querySelector('[data-numeric-region]')
    const visiblePercentCount = [...cell.querySelectorAll('[data-numeric-suffix]')]
      .filter(element => getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0 && element.textContent.trim() === '%').length
    return {
      token: token ? bounds(token) : null,
      suffix: suffix ? bounds(suffix) : null,
      numeric: numeric ? bounds(numeric) : null,
      cell: bounds(cell),
      text: cell.textContent.trim(),
      visiblePercentCount,
      suffixVisibility: suffix ? getComputedStyle(suffix).visibility : null
    }
  }
  const loss = bomTables.flatMap(table => [...table.querySelectorAll('tr[data-candidate-reorder-row][aria-expanded="true"]')]
    .flatMap(main => {
      const recordId = main.getAttribute('data-candidate-reorder-row')
      const rows = [{ kind: 'main', label: 'main', row: main }]
      let detail = main.nextElementSibling
      while (detail && !detail.hasAttribute('data-candidate-reorder-row')) {
        const label = detail.querySelector('th[scope="row"]')?.textContent.trim()
        if (label) rows.push({ kind: 'detail', label, row: detail })
        detail = detail.nextElementSibling
      }
      return rows.map(({ kind, label, row }) => ({
        recordId,
        kind,
        label,
        ...lossMetric(row.children[5])
      }))
    }))
  return { totals, loss }
}
