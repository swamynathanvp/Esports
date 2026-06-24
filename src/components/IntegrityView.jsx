import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import api from '../services/api';

export default function IntegrityView() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIntegrityData();
    }, []);

    const fetchIntegrityData = async () => {
        try {
            const res = await api.get('/users/integrity');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch integrity data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading integrity hub...</div>;

    const officials = users.filter(u => u.role === 'OFFICIAL');
    const recruits = users.filter(u => u.role === 'RECRUIT');

    const calcTrustIndex = (group) => {
        if (group.length === 0) return 100;
        const total = group.reduce((sum, u) => sum + u.trustScore, 0);
        return Math.round(total / group.length);
    };

    const officialIndex = calcTrustIndex(officials);
    const recruitIndex = calcTrustIndex(recruits);
    
    // Generate alerts for any user with trustScore < 100
    const flaggedUsers = users.filter(u => u.trustScore < 100);

    const getIssuesList = (user) => {
        if (!user.securityDiagnostics || !user.securityDiagnostics.issues) return 'Unknown integrity violation';
        return user.securityDiagnostics.issues.join(', ');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>Global Integrity Hub</h3>
                    <p className="text-secondary">Anomaly detection and native device trust monitoring across all divisions.</p>
                </div>
                <button onClick={fetchIntegrityData} className="btn-danger">Force Network Sync</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                <div>
                    <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>Official Roster Trust Index</h4>
                    <div className="glass-panel" style={{ padding: '1.5rem', border: officialIndex === 100 ? '1px solid var(--success)' : '1px solid var(--warning)', background: officialIndex === 100 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 165, 0, 0.05)' }}>
                        <h4 style={{ fontSize: '2rem', color: officialIndex === 100 ? 'var(--success)' : 'var(--warning)', marginBottom: '0.5rem' }}>{officialIndex}%</h4>
                        <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                            {officialIndex === 100 ? 'No rooting, developer modes, or active VPN signatures detected on any active squad/duo player.' : 'Warning: Some official devices have dropped below 100% trust.'}
                        </p>
                        <div style={{ background: 'var(--bg-card)', height: '4px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${officialIndex}%`, height: '100%', background: officialIndex === 100 ? 'var(--success)' : 'var(--warning)', boxShadow: officialIndex === 100 ? '0 0 10px var(--success)' : 'none' }}></div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--accent-purple)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>Recruit Network Trust Index</h4>
                    <div className="glass-panel" style={{ padding: '1.5rem', border: recruitIndex === 100 ? '1px solid var(--border-subtle)' : '1px solid var(--accent-crimson)', background: recruitIndex === 100 ? 'var(--bg-card)' : 'rgba(255, 0, 60, 0.05)' }}>
                        <h4 style={{ fontSize: '2rem', color: recruitIndex === 100 ? 'var(--text-primary)' : 'var(--accent-purple)', marginBottom: '0.5rem' }}>{recruitIndex}%</h4>
                        <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                            {recruits.filter(r => r.trustScore < 100).length} Recruits flagged for statistical anomalies and device signature bypasses.
                        </p>
                        <div style={{ background: 'var(--bg-card)', height: '4px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${recruitIndex}%`, height: '100%', background: 'var(--accent-purple)', boxShadow: '0 0 10px var(--accent-purple)' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--accent-crimson)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-crimson)' }}></span>
                    Active Security Exceptions
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {flaggedUsers.map((user) => (
                        <div key={user._id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid var(--accent-crimson)` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0 }}>{user.username}</h4>
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-card)', color: 'var(--accent-purple)', borderRadius: '12px', border: '1px solid var(--accent-purple)' }}>{user.role}</span>
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-card)', color: 'var(--accent-crimson)', borderRadius: '12px', border: '1px solid var(--accent-crimson)' }}>SCORE: {user.trustScore}</span>
                                    </div>
                                    <p className="text-secondary">{getIssuesList(user)}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Reject / Demote</button>
                                    <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Ban Hardware</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {flaggedUsers.length === 0 && <p className="text-muted" style={{textAlign: 'center', padding: '2rem'}}>No security exceptions found. All connected devices are clean.</p>}
                </div>
            </div>

        </div>
    );
}
