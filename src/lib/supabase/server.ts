
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    // Standardize env var extraction
    const getEnv = (name: string) => process.env[name]?.trim()?.replace(/['"]/g, '')

    const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL')
    const supabaseKey = getEnv('SUPABASE_PUBLISHABLE_KEY') ||
                        getEnv('SUPABASE_ANON_KEY') ||
                        getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
                        getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    console.log('[Supabase Server] URL:', supabaseUrl ? `Set (len: ${supabaseUrl.length})` : 'MISSING')
    console.log('[Supabase Server] Key:', supabaseKey ? `Set (len: ${supabaseKey.length})` : 'MISSING')

    if (!supabaseUrl || !supabaseKey) {
        const errorMsg = `Supabase configuration missing. URL: ${supabaseUrl ? 'Set' : 'MISSING'}, Key: ${supabaseKey ? 'Set' : 'MISSING'}.`
        console.error('[Supabase Server]', errorMsg)
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
