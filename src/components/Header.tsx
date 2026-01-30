
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/api/auth/actions'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function Header() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let profile = null
    if (user) {
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            console.error('[Header] Profile fetch error:', error.message)
        }
        
        // Fallback to role in JWT metadata if DB lookup fails/is empty
        profile = {
            role: profileData?.role || user.user_metadata?.role || 'USER'
        }
    }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Link href="/" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} className="premium-gradient">
                    Percentage Tool
                </Link>

                {user && (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link href="/analytics" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                            Analytics
                        </Link>
                        <Link href="/records" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                            Records
                        </Link>
                        <Link href="/topbottom10" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                            Top/Bottom 10
                        </Link>
                        <Link href="/ingest" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                            Ingest
                        </Link>
                        <Link href="/manage" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                            Manage
                        </Link>
                        {profile?.role === 'ADMIN' && (
                            <>
                                <Link href="/admin" style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '500' }}>
                                    Admin
                                </Link>
                                <Link href="/admin/users" style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '500' }}>
                                    Users
                                </Link>
                            </>
                        )}
                    </nav>
                )}
            </div>
            
            {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                            {user.email}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {profile?.role || 'USER'}
                        </div>
                    </div>
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
            ) : (
                <Link href="/login" style={{ 
                    fontSize: '0.9rem', 
                    color: 'var(--accent)', 
                    fontWeight: '500',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(0, 112, 243, 0.1)'
                }}>
                    Sign In
                </Link>
            )}
        </header>
    )
}
