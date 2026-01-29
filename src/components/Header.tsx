
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/api/auth/actions'
import Link from 'next/link'

export default async function Header() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return (
        <header style={{ 
            borderBottom: '1px solid var(--border)', 
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--glass)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <Link href="/" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} className="premium-gradient">
                Percentage Tool
            </Link>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {user.email}
                </span>
                <form action={signOut}>
                    <button type="submit" style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--error)',
                        fontWeight: '500'
                    }}>
                        Sign Out
                    </button>
                </form>
            </div>
        </header>
    )
}
