'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutDashboard, ArrowLeft, Target, RefreshCcw, Search } from 'lucide-react';
import Link from 'next/link';

function SimilarityContent() {
    const searchParams = useSearchParams();
    const recordId = searchParams.get('id');

    const [loadingSimilar, setLoadingSimilar] = useState(false);
    const [targetRecord, setTargetRecord] = useState<any>(null);
    const [similarRecords, setSimilarRecords] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Load persisted data on mount
    useEffect(() => {
        if (recordId) {
            // Check for existing similarity analysis
            runSimilarityCheck(false);
        }
    }, [recordId]);

    const runSimilarityCheck = async (force: boolean = false) => {
        if (!recordId) return;
        setLoadingSimilar(true);
        setError(null);
        try {
            const res = await fetch('/api/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'similarity',
                    targetId: recordId,
                    limit: 10,
                    forceRegenerate: force
                })
            });
            const data = await res.json();

            if (res.ok) {
                setSimilarRecords(data.results || []);
            } else {
                setError(data.error || 'Failed to find similar items');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoadingSimilar(false);
        }
    };

    // Fetch content metadata (separate to avoid blocking UI?)
    // Or we could have merged it, but keeping it simple.
    useEffect(() => {
        const fetchTarget = async () => {
            if (!recordId) return;
            try {
                const res = await fetch('/api/analytics/compare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recordId, forceRegenerate: false })
                });
                const data = await res.json();
                if (res.ok) {
                    setTargetRecord({
                        id: recordId,
                        content: data.recordContent,
                        type: data.recordType,
                        category: data.metadata?.category || 'Unknown'
                    });
                }
            } catch (e) {
                // Ignore error, just wont show header details
            }
        };
        fetchTarget();
    }, [recordId]);

    if (!recordId) return <div className="container" style={{ padding: '40px' }}>Invalid Record ID</div>;

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="premium-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Search size={32} color="var(--accent)" /> Simplified Similarity
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Analysis results are auto-saved.</p>
                </div>
                <Link href="/" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={18} /> Dashboard
                </Link>
            </header>

            {/* Target Record Display */}
            {targetRecord && (
                <div className="glass-card" style={{ padding: '32px', marginBottom: '32px', borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Target size={20} color="var(--accent)" />
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                                SELECTED {targetRecord.type}
                            </span>
                        </div>
                    </div>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
                        {targetRecord.content}
                    </p>
                    <div style={{ marginTop: '24px' }}>
                        <button
                            onClick={() => runSimilarityCheck(true)}
                            disabled={loadingSimilar}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                        >
                            {loadingSimilar ? <RefreshCcw className="spinner" size={18} /> : <RefreshCcw size={18} />}
                            {loadingSimilar ? 'Processing...' : (similarRecords.length > 0 ? 'Re-run Analysis' : 'Detect Similar Items')}
                        </button>
                    </div>
                </div>
            )}

            {loadingSimilar ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '24px' }}>
                    <RefreshCcw className="spinner" size={48} color="var(--accent)" />
                    <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Identifying Similarities...</p>
                </div>
            ) : error ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--error)' }}>
                    {error}
                </div>
            ) : similarRecords.length > 0 ? (
                <div>
                    <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Target size={18} color="var(--accent)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.5px' }}>TOP MATCHES</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {similarRecords.map((item, i) => (
                                <div key={item.record.id} style={{
                                    padding: '24px 32px',
                                    borderBottom: i === similarRecords.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    background: 'rgba(255,255,255,0.01)',
                                    transition: 'background 0.2s'
                                }} className="hover:bg-white/5">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: (item.aiScore ? item.aiScore > 80 : item.similarity > 0.8) ? '#00ff88' : 'var(--accent)',
                                            fontWeight: 700,
                                            background: (item.aiScore ? item.aiScore > 80 : item.similarity > 0.8) ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 112, 243, 0.1)',
                                            padding: '4px 8px',
                                            borderRadius: '4px'
                                        }}>
                                            {item.aiScore ? `${item.aiScore}% RELEVANCE` : `${(item.similarity * 100).toFixed(1)}% SIMILARITY`}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>
                                            {item.record.category}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '1rem', opacity: 0.9, lineHeight: '1.6' }}>{item.record.content}</p>

                                    {item.reason && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', borderLeft: '2px solid var(--accent)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--accent)', marginRight: '6px' }}>AI Note:</span>
                                                {item.reason}
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                                        <Link href={`/compare?id=${item.record.id}`} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>
                                            View Alignment
                                        </Link>
                                        <Link href={`/similarity?id=${item.record.id}`} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>
                                            Find Similar
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}

export default function SimilarityPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SimilarityContent />
        </Suspense>
    );
}
