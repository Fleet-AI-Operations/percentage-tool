
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
