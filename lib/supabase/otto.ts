/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient, type PostgrestError } from '@supabase/supabase-js'

type OttoClient = ReturnType<typeof createClient<any, string>>

const globalForOtto = globalThis as unknown as {
  ottoAdmin: OttoClient | undefined
}

function getEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

function validateSupabaseConfig(url: string, serviceRoleKey: string): void {
  try {
    new URL(url)
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${url}`)
  }

  const parts = serviceRoleKey.split('.')
  const looksLikeJwt = parts.length === 3 && serviceRoleKey.startsWith('eyJ')
  if (!looksLikeJwt) {
    throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format. Expected a JWT from Supabase (starts with "eyJ").')
  }
}

export function getOttoClient() {
  if (globalForOtto.ottoAdmin) return globalForOtto.ottoAdmin

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  validateSupabaseConfig(url, serviceRoleKey)

  const client = createClient<any, string>(
    url,
    serviceRoleKey,
    {
      db: { schema: 'otto' },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
  globalForOtto.ottoAdmin = client

  return client
}

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
