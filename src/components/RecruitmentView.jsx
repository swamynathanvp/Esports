import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowUpRight, ShieldCheck, ShieldAlert, Key } from 'lucide-react';
import api from '../services/api';

export default function RecruitmentView({ activeGame }) {
    const [recruits, setRecruits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecruits();
    }, []);

    const fetchRecruits = async () => {
        try {
            const res = await api.get('/users/all');
            setRecruits(res.data.filter(u => u.role === 'RECRUIT'));
        } catch (err) {
            console.error('Failed to fetch recruits', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (userId, newRole) => {
        try {
            await api.post('/users/promote', { userId, newRole });
            fetchRecruits();
            alert(`Player promoted to ${newRole}`);
        } catch (err) {
            console.error('Failed to promote player', err);
        }
    };



    if (loading) return <div>Loading recruits...</div>;

    const flaggedCount = recruits.filter(r => r.trustScore < 100).length;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>Recruitment Assessment</h3>
                    <p className="text-secondary">Evaluate and promote test players for {activeGame}. Generate codes to onboard new players outside the clan.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 className="text-cyan glow-text" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{recruits.length}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Trials</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 className="text-purple glow-text" style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--accent-purple)' }}>0</h4>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Tier 1 Prospects</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', border: flaggedCount > 0 ? '1px solid var(--accent-crimson)' : 'none' }}>
                    <h4 className={flaggedCount > 0 ? "text-crimson glow-text-crimson" : "text-muted"} style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{flaggedCount}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Suspicious Flags</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recruits.map((p, idx) => (
                    <div key={p._id || idx} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid var(--accent-purple)` }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '25%' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid var(--accent-purple)` }}></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{p.username}</h3>
                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Unassigned</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                Recruit
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Trust Score</p>
                                <p style={{ fontWeight: '600', color: p.trustScore === 100 ? 'var(--success)' : 'var(--accent-crimson)' }}>
                                    {p.trustScore === 100 ? <ShieldCheck size={14} className="text-success" style={{marginRight: '4px', verticalAlign: 'text-bottom'}} /> : <ShieldAlert size={14} className="text-crimson" style={{marginRight: '4px', verticalAlign: 'text-bottom'}} />}
                                    {p.trustScore}/100
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handlePromote(p._id, 'OFFICIAL')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'transparent', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ArrowUpRight size={14} /> Promote Official
                            </button>
                            <button onClick={() => handlePromote(p._id, 'INVITED')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                Set External
                            </button>
                        </div>
                    </div>
                ))}
                {recruits.length === 0 && <p className="text-muted" style={{textAlign: 'center', padding: '2rem'}}>No active recruits found.</p>}
            </div>
        </div>
    );
}
