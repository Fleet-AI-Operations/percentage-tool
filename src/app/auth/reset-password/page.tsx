
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearResetFlagAction } from './actions';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        try {
            if (!supabase) {
                throw new Error('Supabase client failed to initialize. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable.');
            }

            // 1. Update Supabase Auth password
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });

            if (authError) throw authError;

            // 2. Clear reset flag via Server Action
            const result = await clearResetFlagAction();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to clear password reset flag');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
                <div className="glass-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
                    <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: '24px' }} />
                    <h1 className="premium-gradient" style={{ marginBottom: '16px' }}>Password Reset!</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Your password has been updated. Redirecting you to the dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ padding: '8px', background: 'rgba(0, 112, 243, 0.1)', borderRadius: '8px' }}>
                        <Lock size={24} color="var(--accent)" />
                    </div>
                    <h1 className="premium-gradient" style={{ fontSize: '1.5rem' }}>Secure Your Account</h1>
                </div>
                
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    An administrator has created your account. For your security, please choose a new password before continuing.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="input-field"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Must match"
                            className="input-field"
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ color: 'var(--error)', fontSize: '0.85rem', background: 'rgba(255, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
