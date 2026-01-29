
'use client';

import { useState, useEffect } from 'react';
import { UserCheck, UserX, Shield, User as UserIcon, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface Profile {
    id: string;
    email: string;
    role: 'PENDING' | 'USER' | 'MANAGER' | 'ADMIN';
    mustResetPassword?: boolean;
    createdAt: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);
    
    // Create User Form State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('USER');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: any) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
            });

            if (res.ok) {
                const newUser = await res.json();
                setUsers([newUser, ...users]);
                setShowCreateForm(false);
                setNewEmail('');
                setNewPassword('');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create user');
            }
        } catch (err) {
            console.error('Create user error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const updateRole = async (userId: string, newRole: string) => {
        setActioningId(userId);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });
            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
            }
        } catch (err) {
            console.error('Failed to update role', err);
        } finally {
            setActioningId(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--accent)" />
            </div>
        );
    }

    const pendingUsers = users.filter(u => u.role === 'PENDING');
    const activeUsers = users.filter(u => u.role !== 'PENDING');

    return (
        <div className="container" style={{ maxWidth: '1000px', padding: '40px 20px' }}>
            <header style={{ marginBottom: '40px' }}>
                <Link href="/" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '0.9rem',
                    marginBottom: '16px',
                    textDecoration: 'none'
                }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="premium-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>User Management</h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Approve new sign-ups and manage permissions.</p>
                    </div>
                    <button 
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
                    >
                        <UserPlus size={18} /> {showCreateForm ? 'Cancel' : 'Add New User'}
                    </button>
                </div>
            </header>

            <main style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {/* Create User Form */}
                {showCreateForm && (
                    <section className="glass-card" style={{ padding: '32px', border: '1px solid var(--accent)' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Create New User</h2>
                        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Email Address</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="input-field" 
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Initial Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="input-field" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Role</label>
                                <select 
                                    className="input-field"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    style={{ padding: '10px' }}
                                >
                                    <option value="USER">User</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" disabled={isCreating} style={{ padding: '12px 32px' }}>
                                    {isCreating ? <Loader2 className="animate-spin" size={20} /> : 'Create User & Require Password Reset'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}
                {/* Pending Approvals Section */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '8px', background: 'rgba(255, 171, 0, 0.1)', borderRadius: '8px' }}>
                            <UserCheck size={20} color="#ffab00" />
                        </div>
                        <h2 style={{ fontSize: '1.25rem' }}>Pending Approvals ({pendingUsers.length})</h2>
                    </div>

                    {pendingUsers.length === 0 ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                            No users waiting for approval.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pendingUsers.map(user => (
                                <UserRow 
                                    key={user.id} 
                                    user={user} 
                                    onApprove={() => updateRole(user.id, 'USER')}
                                    isActioning={actioningId === user.id}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Active Users Section */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '8px', background: 'rgba(0, 112, 243, 0.1)', borderRadius: '8px' }}>
                            <Shield size={20} color="var(--accent)" />
                        </div>
                        <h2 style={{ fontSize: '1.25rem' }}>All Users</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeUsers.map(user => (
                            <UserRow 
                                key={user.id} 
                                user={user} 
                                onRoleChange={(role) => updateRole(user.id, role)}
                                isActioning={actioningId === user.id}
                            />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

function UserRow({ user, onApprove, onRoleChange, isActioning }: { 
    user: Profile, 
    onApprove?: () => void,
    onRoleChange?: (role: string) => void,
    isActioning: boolean
}) {
    return (
        <div className="glass-card" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 24px',
            opacity: isActioning ? 0.6 : 1
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <UserIcon size={20} color="rgba(255,255,255,0.6)" />
                </div>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{user.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {user.role === 'PENDING' ? (
                    <button 
                        onClick={onApprove}
                        disabled={isActioning}
                        className="btn-primary" 
                        style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                    >
                        Approve User
                    </button>
                ) : (
                    <select 
                        value={user.role} 
                        onChange={(e) => onRoleChange?.(e.target.value)}
                        disabled={isActioning}
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            color: 'white', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            padding: '8px 12px', 
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="USER">User</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                )}
            </div>
        </div>
    );
}
