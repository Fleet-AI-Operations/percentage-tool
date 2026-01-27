'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, BarChart3, ArrowRight, MessageSquare, Target, Zap, Sparkles, Bot } from 'lucide-react';
import Link from 'next/link';

interface Project {
    id: string;
    name: string;
    lastTaskAnalysis?: string | null;
    lastFeedbackAnalysis?: string | null;
}

interface Match {
    task: {
        id: string;
        content: string;
        category: string;
        score?: any;
    };
    feedback: {
        id: string;
        content: string;
        category: string;
    };
    similarity: number;
}

export default function AnalyticsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);
    const [threshold, setThreshold] = useState(0.75);

    // Isolated Analysis States
    const [taskAnalysis, setTaskAnalysis] = useState<string | null>(null);
    const [feedbackAnalysis, setFeedbackAnalysis] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'SIMILARITY' | 'TASK_THEMES' | 'FEEDBACK_THEMES'>('SIMILARITY');

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            fetchAnalytics();
            // Load existing isolation analyses
            const project = projects.find(p => p.id === selectedProjectId);
            setTaskAnalysis(project?.lastTaskAnalysis || null);
            setFeedbackAnalysis(project?.lastFeedbackAnalysis || null);
        }
    }, [selectedProjectId, threshold, projects]);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(data);
            if (data.length > 0) setSelectedProjectId(data[0].id);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/similarity?projectId=${selectedProjectId}&threshold=${threshold}`);
            const data = await res.json();
            setMatches(data.matches || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runLLMCheck = async (type: 'TASK' | 'FEEDBACK') => {
        setAnalyzing(true);
        try {
            const res = await fetch('/api/analytics/trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: selectedProjectId, type }),
            });
            const data = await res.json();
            if (data.analysis) {
                if (type === 'TASK') {
                    setTaskAnalysis(data.analysis);
                    setActiveTab('TASK_THEMES');
                } else {
                    setFeedbackAnalysis(data.analysis);
                    setActiveTab('FEEDBACK_THEMES');
                }
                // Update local cache
                setProjects(prev => prev.map(p =>
                    p.id === selectedProjectId
                        ? { ...p, [type === 'TASK' ? 'lastTaskAnalysis' : 'lastFeedbackAnalysis']: data.analysis }
                        : p
                ));
            } else {
                alert(data.error || 'Failed to generate analysis');
            }
        } catch (err) {
            console.error(err);
            alert('Analysis failed. Ensure LM Studio is running.');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="premium-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Task Analytics</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Isolated Data Insights & Cross-Analysis</p>
                </div>
                <Link href="/" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={18} /> Dashboard
                </Link>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
                {/* Sidebar Controls */}
                <aside>
                    <div className="glass-card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Active Project</label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }}
                            >
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {activeTab === 'SIMILARITY' && (
                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Similarity Threshold: {(threshold * 100).toFixed(0)}%</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="0.99"
                                    step="0.01"
                                    value={threshold}
                                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            <button
                                onClick={() => runLLMCheck('TASK')}
                                disabled={analyzing || !selectedProjectId}
                                className="btn-primary"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                <Target size={16} /> Analyze Tasks
                            </button>
                            <button
                                onClick={() => runLLMCheck('FEEDBACK')}
                                disabled={analyzing || !selectedProjectId}
                                className="btn-primary"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                <MessageSquare size={16} /> Analyze Feedback
                            </button>
                        </div>

                        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <Zap size={16} color="var(--accent)" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Insights Engine</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6, lineHeight: '1.4' }}>
                                {activeTab === 'SIMILARITY'
                                    ? "Compare tasks and feedback to find semantic correlations."
                                    : "Identify isolated trends within a specific data category."}
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main>
                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => setActiveTab('SIMILARITY')}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: activeTab === 'SIMILARITY' ? 'rgba(0,112,243,0.1)' : 'transparent',
                                color: activeTab === 'SIMILARITY' ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cross-Analysis
                        </button>
                        <button
                            onClick={() => setActiveTab('TASK_THEMES')}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: activeTab === 'TASK_THEMES' ? 'rgba(0,112,243,0.1)' : 'transparent',
                                color: activeTab === 'TASK_THEMES' ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Task Themes
                        </button>
                        <button
                            onClick={() => setActiveTab('FEEDBACK_THEMES')}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                                background: activeTab === 'FEEDBACK_THEMES' ? 'rgba(0,112,243,0.1)' : 'transparent',
                                color: activeTab === 'FEEDBACK_THEMES' ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Feedback Themes
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'TASK_THEMES' && (
                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ background: 'rgba(0, 112, 243, 0.1)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Target size={20} color="var(--accent)" />
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>ISOLATED TASK TRENDS</span>
                            </div>
                            <div style={{ padding: '32px' }}>
                                {taskAnalysis ? (
                                    <div className="markdown-content" style={{ whiteSpace: 'pre-wrap' }}>{taskAnalysis}</div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                                        <Sparkles size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
                                        <p>No task analysis available. Click "Analyze Tasks" in the sidebar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'FEEDBACK_THEMES' && (
                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ background: 'rgba(0, 112, 243, 0.1)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <MessageSquare size={20} color="var(--accent)" />
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>ISOLATED FEEDBACK TRENDS</span>
                            </div>
                            <div style={{ padding: '32px' }}>
                                {feedbackAnalysis ? (
                                    <div className="markdown-content" style={{ whiteSpace: 'pre-wrap' }}>{feedbackAnalysis}</div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                                        <Sparkles size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
                                        <p>No feedback analysis available. Click "Analyze Feedback" in the sidebar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'SIMILARITY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {loading ? (
                                <div style={{ padding: '100px', textAlign: 'center' }}><div className="spinner" /></div>
                            ) : matches.length === 0 ? (
                                <div style={{ padding: '100px', textAlign: 'center', opacity: 0.5 }}>No matches found.</div>
                            ) : (
                                matches.map((match, i) => (
                                    <div key={i} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>MATCH #{i + 1}</span>
                                            <span style={{ color: '#00ff88', fontSize: '0.75rem' }}>{(match.similarity * 100).toFixed(1)}% Similarity</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '24px', padding: '24px' }}>
                                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '8px' }}>TASK</div>
                                                <div style={{ fontSize: '0.9rem' }}>{match.task.content}</div>
                                            </div>
                                            <ArrowRight size={20} style={{ alignSelf: 'center', opacity: 0.1 }} />
                                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.65rem', color: '#00ff88', fontWeight: 700, marginBottom: '8px' }}>FEEDBACK</div>
                                                <div style={{ fontSize: '0.9rem' }}>{match.feedback.content}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
