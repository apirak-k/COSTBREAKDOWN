// Browser-only test instrumentation. Measurements never affect application layout.
export function numericColumnGeometry(root = document) {
  const visible = element => {
    const box = element.getBoundingClientRect()
    return box.width > 12 && box.height > 5 && !element.closest('.sr-only,[hidden]')
  }
  const textBounds = element => {
    const boxes = []
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (!node.textContent.trim() || node.parentElement.closest('svg,[aria-hidden="true"]')) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      boxes.push(...range.getClientRects())
    }
    return boxes.length ? {
      left: Math.min(...boxes.map(box => box.left)),
      right: Math.max(...boxes.map(box => box.right))
    } : null
  }
  const headerFor = region => {
    const cell = region.closest('td,th,[role=cell],[role=rowheader]')
    if (!cell) {
      for(let owner=region.parentElement;owner&&owner!==document.body;owner=owner.parentElement){
        const headers=[...owner.querySelectorAll('[data-numeric-column-header]')].filter(visible)
        const regions=[...owner.querySelectorAll('[data-numeric-region="true"]')].filter(visible)
        if(headers.length===1&&regions.length===1)return headers[0]
        if(owner.matches('article'))break
      }
      return null
    }
    const columnIndex = [...cell.parentElement.children].slice(0, [...cell.parentElement.children].indexOf(cell))
      .reduce((sum, sibling) => sum + (sibling.colSpan || Number(sibling.getAttribute('aria-colspan')) || 1), 0)
    for (let owner = cell.closest('table,[role=table]'); owner; owner = owner.parentElement) {
      const headerRow = [...owner.querySelectorAll('thead:not(.sr-only) tr,[role=row]:has([role=columnheader])')]
        .find(row => visible(row) && row.children.length > columnIndex)
      if (headerRow) {
        const header = headerRow.children[columnIndex]
        const regions=[...cell.querySelectorAll('[data-numeric-region="true"]')]
        const ordinal=regions.indexOf(region)
        const headings=[...header.querySelectorAll('[data-numeric-column-header]')]
        return headings[Math.max(0,ordinal)] ?? header
      }
    }
    return null
  }
  return [...root.querySelectorAll('[data-numeric-region="true"]')].filter(visible).map(region => {
    const box = region.getBoundingClientRect()
    const header = headerFor(region)
    const headerText = header ? textBounds(header) : null
    const center = (box.left + box.right) / 2
    const style = getComputedStyle(region)
    const text = region instanceof HTMLInputElement ? region.value : region.textContent.trim()
    let decimal = null
    let tokenBounds = null
    if (region instanceof HTMLInputElement) {
      const context = document.createElement('canvas').getContext('2d')
      context.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ')
      const mirror=document.createElement('span')
      mirror.textContent=text
      Object.assign(mirror.style,{position:'fixed',left:'-10000px',top:'0',whiteSpace:'pre',fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,letterSpacing:style.letterSpacing,fontVariantNumeric:style.fontVariantNumeric,fontFeatureSettings:style.fontFeatureSettings})
      document.body.append(mirror)
      const width=mirror.getBoundingClientRect().width
      const point=text.indexOf('.')
      let pointOffset=0
      if(point>=0){const range=document.createRange();range.setStart(mirror.firstChild,point);range.setEnd(mirror.firstChild,point+1);pointOffset=range.getBoundingClientRect().left-mirror.getBoundingClientRect().left}
      mirror.remove()
      const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)
      const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)
      const start = (style.textAlign === 'left' || style.textAlign === 'start' ? left : style.textAlign === 'center' ? (left+right-width)/2 : right - width) - region.scrollLeft
      if (text.includes('.')) decimal = start + pointOffset
      tokenBounds = { left: start, right: start + width }
    } else {
      const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        const point = node.textContent.indexOf('.')
        if (point < 0) continue
        const range = document.createRange()
        range.setStart(node, point)
        range.setEnd(node, point + 1)
        decimal = range.getBoundingClientRect().left
        break
      }
      tokenBounds = textBounds(region)
    }
    const scientific = region.getAttribute('data-numeric-fit') === 'scientific' || /E[+-]?\d/.test(text)
    return {
      hasTable: Boolean(region.closest('td,th,[role=cell],[role=rowheader]')), table:region.closest('table,[role=table]')?.getAttribute('aria-label')??region.closest('table')?.querySelector('caption')?.textContent.trim()??null, label: region.getAttribute('aria-label') ?? header?.textContent.trim(),
      text, center, decimal, headerCenter: headerText ? (headerText.left + headerText.right) / 2 : null,
      width: box.width, left: box.left, right: box.right, scientific,
      fitFloor: region.getAttribute('data-numeric-fit-floor'),
      tokenFits: !tokenBounds || (tokenBounds.left >= box.left - 0.6 && tokenBounds.right <= box.right + 0.6),
      focused: region === document.activeElement, header: header?.textContent.trim() ?? null
    }
  })
}

export function numericCenterlineFailures(metrics, { requireHeader = true } = {}) {
  return metrics.flatMap(metric => {
    const failures = []
    if (requireHeader && metric.headerCenter === null) failures.push('missing numeric Header')
    if (metric.headerCenter !== null && Math.abs(metric.headerCenter - metric.center) > 1) failures.push('Header text center differs from numeric region center')
    if (!metric.scientific && metric.decimal !== null && !metric.focused && Math.abs(metric.decimal - metric.center) > 0.6) failures.push('ordinary decimal differs from numeric region center')
    if (!metric.focused && !metric.tokenFits) failures.push('compact token exceeds fixed numeric region')
    if (metric.fitFloor === 'insufficient') failures.push('scientific minimum does not fit')
    return failures.map(failure => ({ failure, ...metric }))
  })
}
