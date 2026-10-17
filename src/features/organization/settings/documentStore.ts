// The prototype has no file storage: a PDF chosen by the user is kept in memory (until the page is reloaded)
// so that "Ver documento" can open it. In the real product the file goes to object storage (MinIO).
const urls = new Map<string, { name: string; url: string }>()

export function keepDocument(orgId: string, file: File): void {
  const old = urls.get(orgId)
  if (old) URL.revokeObjectURL(old.url)
  urls.set(orgId, { name: file.name, url: URL.createObjectURL(file) })
}

/** URL of the file kept in memory, if it is the one currently registered. */
export function documentUrl(orgId: string, name: string): string | null {
  const kept = urls.get(orgId)
  return kept && kept.name === name ? kept.url : null
}
