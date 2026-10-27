/** Saves text as a file in the browser. Nothing is uploaded. A BOM keeps Excel from garbling accented text. */
export function downloadCsv(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
