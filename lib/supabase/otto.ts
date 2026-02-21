import { type PostgrestError } from '@supabase/supabase-js'

export function assertSupabaseError(error: PostgrestError | null, context: string): void {
  if (error) {
    const ownProps = Object.fromEntries(
      Object.getOwnPropertyNames(error).map((key) => [key, (error as unknown as Record<string, unknown>)[key]])
    )

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const host = url ? (() => {
      try {
        return new URL(url).host
      } catch {
        return 'invalid-url'
      }
    })() : 'missing-url'

    const parts = [
      error.message?.trim(),
      error.details?.trim(),
      error.hint?.trim(),
      error.code ? `code=${error.code}` : '',
      `host=${host}`,
      Object.keys(ownProps).length > 0 ? `raw=${JSON.stringify(ownProps)}` : '',
    ].filter(Boolean)

    const body = parts.join(' | ')
    const fallback = `Supabase request failed (likely DNS/network/project URL issue) | host=${host}`
    throw new Error(`${context}: ${body || fallback}`)
  }
}

export function buildSearchPattern(input: string): string {
  return `%${input.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}
