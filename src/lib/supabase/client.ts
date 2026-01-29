
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const getEnv = (name: string) => process.env[name]?.trim()?.replace(/['"]/g, '')

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
    const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || 
                        getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if (typeof window !== 'undefined') {
        console.log('[Supabase Client] URL:', supabaseUrl ? `Set (len: ${supabaseUrl.length})` : 'MISSING')
        console.log('[Supabase Client] Key:', supabaseKey ? `Set (len: ${supabaseKey.length})` : 'MISSING')
    }

    if (!supabaseUrl || !supabaseKey) {
        const errorMsg = 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.'
        console.error('[Supabase Client]', errorMsg)
        throw new Error(errorMsg)
    }

    return createBrowserClient(
        supabaseUrl,
        supabaseKey
    )
}
