
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    // Unified environment variable extraction
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim()?.replace(/['"]/g, '')
    const supabaseKey = (process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()?.replace(/['"]/g, '')

    if (!supabaseUrl || !supabaseKey) {
        const errorMsg = `Supabase configuration missing (URL: ${supabaseUrl ? 'Set' : 'MISSING'}, Key: ${supabaseKey ? 'Set' : 'MISSING'}).`
        throw new Error(errorMsg)
    }

    return createServerClient(
        supabaseUrl!,
        supabaseKey!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/**
 * ADMIN CLIENT: Uses Service Role Key to bypass RLS and perform admin actions.
 * NEVER use this on the client side.
 */
export async function createAdminClient() {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim()?.replace(/['"]/g, '')
    const supabaseServiceKey = (
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY
    )?.trim()?.replace(/['"]/g, '')

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase Admin config missing (SUPABASE_SERVICE_ROLE_KEY)')
    }

    // Diagnostic check: if the key is an anon key, it will fail admin operations
    if (supabaseServiceKey.includes('anon')) {
        console.warn('[Supabase Admin] The provided key appears to be an ANON key, not a SERVICE ROLE key. Admin operations will likely fail.')
    }

    return createServerClient(
        supabaseUrl,
        supabaseServiceKey,
        {
            cookies: {
                getAll() { return [] },
                setAll() { },
            },
        }
    )
}
