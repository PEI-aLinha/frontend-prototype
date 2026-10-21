export interface PrintSection { title: string; headers: string[]; rows: string[][] }

/** Escapes user-supplied text before it goes into the printed document. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function table(section: PrintSection): string {
  const head = section.headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('')
  const body = section.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
  return `<h2>${escapeHtml(section.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

const STYLE = `body{font-family:'Nunito Sans',system-ui,sans-serif;color:#202124;margin:40px}h1{font-size:22px}h2{font-size:15px;margin-top:28px}p{color:#555a5f;font-size:13px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #d9dde0;padding:8px;text-align:left}th{background:#f7f7f8;font-family:monospace;text-transform:uppercase;font-size:10px;color:#646a6f}`

/**
 * Simulated "PDF": opens a printable version and hands it to the browser, so the user saves or
 * prints it. A real PDF generator would be a dependency and a rendering engine for a prototype.
 */
export function printDocument(doc: { title: string; intro: string; sections: PrintSection[] }): void {
  const w = window.open('', '_blank', 'noopener=no')
  if (!w) return
  w.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
<style>${STYLE}</style></head>
<body><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.intro)}</p>${doc.sections.map(table).join('')}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
}