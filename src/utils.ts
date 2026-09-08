export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function publicError(error: unknown, fallback = 'Request failed') {
  return error instanceof Error ? error.message : fallback
}
