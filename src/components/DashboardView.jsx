import React, { useState, useEffect } from 'react';
import { Target, Trophy, Clock, ShieldAlert } from 'lucide-react';
import api from '../services/api';

export default function DashboardView() {
    const [stats, setStats] = useState({
        officials: 0,
        recruits: 0,
        avgTrust: 100,
        verifiedDevices: 0,
        totalDevices: 0,
        activeExceptions: 0,
        pipelineCount: 0,
        tier1Count: 0,
        flagsCount: 0
    });
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // A real app would have a dedicated /api/stats route, but we'll infer it from /api/users/all for now
            const res = await api.get('/users/all');
            const users = res.data;
            
            const officials = users.filter(u => u.role === 'OFFICIAL');
            const recruits = users.filter(u => u.role === 'RECRUIT');
            const allPlayers = [...officials, ...recruits, ...users.filter(u => u.role === 'INVITED')];
            
            let totalTrust = 0;
            let flagged = 0;
            let activeDevices = 0;
            
            allPlayers.forEach(p => {
                totalTrust += p.trustScore;
                if (p.trustScore < 100) flagged++;
                if (p.activeSessionId) activeDevices++;
            });
            
            const avgTrust = allPlayers.length > 0 ? Math.round(totalTrust / allPlayers.length) : 100;
            
            setStats({
                officials: officials.length,
                recruits: recruits.length,
                avgTrust,
                verifiedDevices: activeDevices,
                totalDevices: allPlayers.length,
                activeExceptions: flagged,
                pipelineCount: recruits.length,
                tier1Count: 0, // Mock for now until we add tiers to DB
                flagsCount: flagged
            });
            
        } catch (err) {
            console.error("Failed fetching stats", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading command center data...</div>;

    return (
        <div>
            <h3 style={{ marginBottom: '1rem' }}>Welcome back, Manager.</h3>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                The integrity network is actively monitoring <b>{stats.officials} Official Players</b> and <b>{stats.recruits} Recruits</b>.
            </p>

            {/* Official Roster Snapshot */}
            <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Official Network Overview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <Target size={24} className="text-cyan" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{stats.avgTrust}%</h4>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Avg Trust Score</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <Trophy size={24} className="text-cyan" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{stats.verifiedDevices}/{stats.totalDevices}</h4>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Sessions</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <Clock size={24} className="text-cyan" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Live</h4>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Monitoring Status</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', border: stats.activeExceptions === 0 ? '1px solid var(--success)' : '1px solid var(--accent-crimson)', background: stats.activeExceptions === 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 0, 60, 0.05)' }}>
                        <ShieldAlert size={24} color={stats.activeExceptions === 0 ? 'var(--success)' : 'var(--accent-crimson)'} style={{ marginBottom: '1rem' }} />
                        <h4 style={{ fontSize: '1.5rem', marginBottom: '4px', color: stats.activeExceptions === 0 ? 'var(--success)' : 'var(--accent-crimson)' }}>{stats.activeExceptions}</h4>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Exceptions</p>
                    </div>
                </div>
            </div>

            {/* Recruitment Snapshot */}
            <h4 style={{ color: 'var(--accent-purple)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Recruitment Pipeline</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '3px solid var(--accent-purple)' }}>
                    <h4 style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-primary)' }}>{stats.pipelineCount}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Players in Pipeline</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '3px solid var(--accent-purple)' }}>
                    <h4 style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--accent-cyan)' }}>{stats.tier1Count}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Tier 1 Promoted</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', border: stats.flagsCount === 0 ? '1px solid var(--border-subtle)' : '1px solid var(--accent-crimson)', background: stats.flagsCount > 0 ? 'var(--accent-crimson-glow)' : 'var(--bg-card)' }}>
                    <h4 style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-primary)' }}>{stats.flagsCount}</h4>
                    <p className={stats.flagsCount > 0 ? 'text-primary' : 'text-secondary'} style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Integrity Flags Detected</p>
                </div>
            </div>
        </div>
    );
}
