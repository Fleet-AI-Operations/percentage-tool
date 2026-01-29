
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    // IMPORTANT: Next.js requires STATIC property access (process.env.NAME) 
    // for client-side variables to be correctly bundled. 
    // Dynamic access like process.env[name] will FAIL in the browser.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/['"]/g, '')
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()?.replace(/['"]/g, '')

    if (!supabaseUrl || !supabaseKey) {
        const errorMsg = 'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) are missing in the browser. Please add them to your Vercel Environment Variables.'
        console.error('[Supabase Client]', errorMsg)
        return null;
    }

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
}
