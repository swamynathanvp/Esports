import React from 'react';

export default function ScheduleView() {
    const upcoming = [
        { date: 'Today, 8:00 PM', event: 'BGIS Semifinals', opponent: 'GodLike', type: 'Tournament' },
        { date: 'Tomorrow, 2:00 PM', event: 'Daily Scrims', opponent: 'Team XSpark', type: 'Practice' },
    ];

    const past = [
        { date: 'Yesterday', event: 'BGIS Quarterfinals', opponent: 'Global Esports', result: 'Won (2-1)' },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p className="text-secondary">Upcoming tournaments, scrims, and practice schedules.</p>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Add Event</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Upcoming Matches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {upcoming.map((match, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.2rem' }}>vs {match.opponent}</h4>
                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--accent-bg)', color: 'var(--accent-cyan)', borderRadius: '12px' }}>{match.type}</span>
                                </div>
                                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>{match.event}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></span>
                                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{match.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Recent Results</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {past.map((match, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderLeft: match.result.includes('Won') ? '4px solid var(--success)' : '4px solid var(--accent-crimson)' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>vs {match.opponent}</h4>
                                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{match.event}</p>
                                <p style={{ color: match.result.includes('Won') ? 'var(--success)' : 'var(--accent-crimson)', fontWeight: '600' }}>{match.result}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
