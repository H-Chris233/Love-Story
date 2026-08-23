export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    return (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ??
      character
    )
  })
}
