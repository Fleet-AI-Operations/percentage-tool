
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    // Exhaustive log of ALL environment variable keys to see what Vercel is actually passing
    const allKeys = Object.keys(process.env)
    console.log('[Supabase Server] Total env keys:', allKeys.length)
    console.log('[Supabase Server] Node Version:', process.version)
    console.log('[Supabase Server] Environment Fingerprint:', {
        isVercel: !!process.env.VERCEL,
        isDocker: !!process.env.DOCKER_CONTAINER || !!process.env.HOSTNAME?.includes('-'),
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
    })
    console.log('[Supabase Server] Supabase/Next Keys Found:', allKeys.filter(k => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('next_public')).join(', '))

    // Direct access instead of dynamic lookup for maximum compatibility
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim()?.replace(/['"]/g, '')
    const supabaseKey = (process.env.SUPABASE_PUBLISHABLE_KEY || 
                        process.env.SUPABASE_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()?.replace(/['"]/g, '')

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
