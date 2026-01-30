'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, LayoutDashboard, FileCheck, Sparkles, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { TaskMetadata } from '@/lib/types';

type SortField = 'createdAt' | 'alignmentScore' | 'environment';
type SortOrder = 'asc' | 'desc';

interface Record {
    id: string;
    content: string;
    type: string;
    category: string;
    metadata: TaskMetadata | null;
    alignmentAnalysis?: string | null;
    createdAt: string;
}

const extractAlignmentScore = (analysis: string | null | undefined): string | null => {
    if (!analysis) return null;
    // Look for patterns like "Alignment Score (0-100): 85" or "Score (0-100)\n85"
    const regex = /(?:Alignment Score \(0-100\)|Score)[:\s\n]*(\d+)/i;
    const match = analysis.match(regex);
    return match ? match[1] : null;
};

export default function ListView() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ListContent />
        </Suspense>
    );
}

function ListContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const [records, setRecords] = useState<Record[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const pageSize = 10;
    const hasRequiredParams = projectId && type && category;

    useEffect(() => {
        if (!hasRequiredParams) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchRecords = async () => {
            setLoading(true);
            try {
                const skip = (page - 1) * pageSize;
                const res = await fetch(`/api/records?projectId=${projectId}&type=${type}&category=${category}&skip=${skip}&take=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
                const data = await res.json();
                if (!cancelled) {
                    setRecords(data.records || []);
                    setTotal(data.total || 0);
                }
            } catch (err) {
                console.error('Failed to fetch records', err);
                if (!cancelled) {
                    setRecords([]);
                    setTotal(0);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchRecords();

        return () => { cancelled = true; };
    }, [projectId, type, category, page, sortBy, sortOrder]);

    const handleSortChange = (field: SortField) => {
        if (field === sortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setPage(1); // Reset to first page when sorting changes
    };


    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="premium-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px', textTransform: 'capitalize' }}>
                        {category?.replace('_', ' ').toLowerCase()} {type === 'TASK' ? 'Tasks' : 'Feedback'}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Exploration View{!loading && ` • ${total} Total Records`}</p>
                </div>
                <Link href="/" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={18} /> Dashboard
                </Link>
            </header>

            <main>

                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                            {loading ? 'Loading...' : total > 0 ? `Showing ${((page - 1) * pageSize) + 1} - ${Math.min(page * pageSize, total)} of ${total}` : 'No records'}
                        </span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowUpDown size={14} style={{ opacity: 0.6 }} />
                                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => handleSortChange(e.target.value as SortField)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        padding: '6px 10px',
                                        color: 'inherit',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="createdAt">Date</option>
                                    <option value="alignmentScore">Alignment Score</option>
                                    <option value="environment">Environment</option>
                                </select>
                                <button
                                    className="btn-outline"
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn-outline"
                                    style={{ padding: '6px 12px' }}
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    className="btn-outline"
                                    style={{ padding: '6px 12px' }}
                                    disabled={page >= totalPages || totalPages === 0}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {records.map((record, i) => (
                            <div key={record.id} style={{
                                padding: '24px',
                                borderBottom: i === records.length - 1 ? 'none' : '1px solid var(--border)',
                                background: 'rgba(255,255,255,0.01)',
                                transition: 'all 0.2s'
                            }} className="record-hover">
                                <div style={{ fontSize: '1rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}>
                                    {record.content}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {type === 'TASK' && (
                                            <div style={{
                                                fontSize: '0.7rem',
                                                background: record.metadata?.avg_score !== undefined ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                color: record.metadata?.avg_score !== undefined ? '#00ff88' : 'rgba(255, 255, 255, 0.4)',
                                                fontWeight: 700,
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                border: `1px solid ${record.metadata?.avg_score !== undefined ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: record.metadata?.avg_score !== undefined ? '#00ff88' : 'rgba(255, 255, 255, 0.3)' }}></div>
                                                Model Score: {record.metadata?.avg_score !== undefined
                                                    ? `${(parseFloat(String(record.metadata.avg_score)) * 100).toFixed(0)}%`
                                                    : 'N/A'}
                                            </div>
                                        )}

                                        {record.alignmentAnalysis ? (
                                            <Link
                                                href={`/compare?id=${record.id}`}
                                                style={{
                                                    fontSize: '0.7rem',
                                                    background: 'rgba(0, 112, 243, 0.1)',
                                                    color: 'var(--accent)',
                                                    fontWeight: 700,
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    border: '1px solid rgba(0, 112, 243, 0.2)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    textDecoration: 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="hover-bright"
                                            >
                                                <Sparkles size={10} />
                                                Alignment: {extractAlignmentScore(record.alignmentAnalysis)}%
                                            </Link>
                                        ) : (
                                            <Link
                                                href={`/compare?id=${record.id}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.7rem',
                                                    color: 'var(--accent)',
                                                    fontWeight: 600,
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(0, 112, 243, 0.05)',
                                                    border: '1px solid rgba(0, 112, 243, 0.1)',
                                                    transition: 'all 0.2s',
                                                    textDecoration: 'none'
                                                }}
                                                className="hover-bright"
                                            >
                                                <FileCheck size={12} /> Generate Alignment Score
                                            </Link>
                                        )}

                                        <span style={{ fontSize: '0.75rem', opacity: 0.4, marginLeft: '8px' }}>{new Date(record.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {records.length === 0 && !loading && (
                            <div style={{ padding: '80px', textAlign: 'center', opacity: 0.4 }}>
                                {hasRequiredParams ? 'No records found' : 'Select a category from the dashboard to view records'}
                            </div>
                        )}
                        {loading && (
                            <div style={{ padding: '80px', textAlign: 'center', opacity: 0.4 }}>Loading...</div>
                        )}
                    </div>
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px' }}>
                        <button
                            className="btn-outline"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                        >Previous</button>

                        <div style={{ display: 'flex', gap: '8px', margin: '0 16px' }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((pageNum, i, arr) => {
                                    const elements = [];
                                    if (i > 0 && arr[i - 1] !== pageNum - 1) {
                                        elements.push(<span key={`sep-${pageNum}`} style={{ opacity: 0.3 }}>...</span>);
                                    }
                                    elements.push(
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={page === pageNum ? 'btn-primary' : 'btn-outline'}
                                            style={{ width: '40px', height: '40px', padding: 0 }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                    return elements;
                                })}
                        </div>

                        <button
                            className="btn-outline"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                        >Next</button>
                    </div>
                )}
            </main>
        </div>
    );
}
