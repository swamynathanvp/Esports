import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, X, Monitor, Key } from 'lucide-react';
import api from '../services/api';

export default function AllMembersView() {
    const [members, setMembers] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [deviceHistory, setDeviceHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const res = await api.get('/users/all');
            setMembers(res.data);
        } catch (err) {
            console.error('Failed to fetch members:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInvite = async (type) => {
        try {
            const res = await api.post('/invites/generate', { type });
            const inviteCode = res.data.code;
            
            try {
                await navigator.clipboard.writeText(inviteCode);
                alert(`Invite Code Generated & Copied: ${inviteCode}`);
            } catch (err) {
                alert(`Invite Code Generated: ${inviteCode}`);
            }
        } catch (err) {
            alert('Failed to generate invite');
        }
    };

    const handleUserClick = async (user) => {
        if (user.role === 'MANAGER') return; // Managers don't have device history tracked in this UI
        setSelectedUser(user);
        setLoadingHistory(true);
        try {
            const res = await api.get(`/users/device-history/${user._id}`);
            setDeviceHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch device history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const closeModal = () => {
        setSelectedUser(null);
        setDeviceHistory([]);
    };

    const filteredMembers = filter === 'ALL'
        ? members
        : members.filter(m => m.role === filter);

    const getStatusColor = (status) => {
        switch (status) {
            case 'MANAGER': return 'var(--accent-crimson)';
            case 'OFFICIAL': return 'var(--accent-cyan)';
            case 'RECRUIT': return 'var(--accent-purple)';
            case 'INVITED': return 'var(--text-secondary)';
            default: return 'var(--text-muted)';
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading directory...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>Organization Directory</h3>
                    <p className="text-secondary">Track the native application activity and trust scores of every connected player. Click on a player to view device history.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {filter === 'RECRUIT' && (
                        <button onClick={() => handleGenerateInvite('CLAN')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', color: '#fff' }}>
                            <Key size={18} /> Generate Recruit Code
                        </button>
                    )}
                    {filter === 'INVITED' && (
                        <button onClick={() => handleGenerateInvite('INVITED')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}>
                            <Key size={18} /> Generate External Code
                        </button>
                    )}
                    {filter === 'OFFICIAL' && (
                        <button onClick={() => handleGenerateInvite('OFFICIAL')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                            <Key size={18} /> Generate Official Code
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => setFilter('ALL')} className={filter === 'ALL' ? 'btn-primary' : ''} style={{ padding: '8px 16px', background: filter === 'ALL' ? 'var(--accent-cyan)' : 'transparent', color: filter === 'ALL' ? 'var(--bg-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>All Members</button>
                <button onClick={() => setFilter('OFFICIAL')} className={filter === 'OFFICIAL' ? 'btn-primary' : ''} style={{ padding: '8px 16px', background: filter === 'OFFICIAL' ? 'var(--accent-cyan)' : 'transparent', color: filter === 'OFFICIAL' ? 'var(--bg-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Official Members</button>
                <button onClick={() => setFilter('INVITED')} className={filter === 'INVITED' ? 'btn-primary' : ''} style={{ padding: '8px 16px', background: filter === 'INVITED' ? 'var(--bg-card)' : 'transparent', color: filter === 'INVITED' ? 'var(--text-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>External Members</button>
                <button onClick={() => setFilter('RECRUIT')} className={filter === 'RECRUIT' ? 'btn-primary' : ''} style={{ padding: '8px 16px', background: filter === 'RECRUIT' ? 'var(--accent-purple)' : 'transparent', color: filter === 'RECRUIT' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Recruit Members</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredMembers.map((p) => {
                    const squadName = p.squadAssignment ? p.squadAssignment.name : 'Unassigned';
                    const isManager = p.role === 'MANAGER';
                    
                    return (
                        <div 
                            key={p._id} 
                            onClick={() => handleUserClick(p)}
                            className="glass-panel" 
                            style={{ 
                                padding: '1rem 1.5rem', 
                                display: 'grid', 
                                gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 2fr 1fr', 
                                alignItems: 'center', 
                                gap: '1.5rem', 
                                borderLeft: `4px solid ${getStatusColor(p.role)}`,
                                cursor: isManager ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                if (!isManager) e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                if (!isManager) e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid ${getStatusColor(p.role)}` }}></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{p.username}</h3>
                                    {!isManager && <p className="text-muted" style={{ fontSize: '0.8rem' }}>{squadName}</p>}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--bg-card)', color: getStatusColor(p.role), borderRadius: '12px', border: `1px solid ${getStatusColor(p.role)}`, fontWeight: 'bold' }}>
                                    {p.role}
                                </span>
                            </div>

                            {!isManager && (
                                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        {p.trustScore === 100 ? <ShieldCheck size={16} className="text-success" /> : <ShieldAlert size={16} className="text-crimson" />}
                                        <p style={{ fontWeight: '600', color: p.trustScore === 100 ? 'var(--success)' : 'var(--accent-crimson)', fontSize: '0.9rem' }}>{p.trustScore}/100</p>
                                        <p className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Trust Score</p>
                                    </div>
                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                            {p.activeSessionId ? <span style={{color: 'var(--success)'}}>ONLINE</span> : 'OFFLINE'}
                                        </p>
                                        <p className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Status</p>
                                    </div>
                                </div>
                            )}

                            {isManager && <div></div>}

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                {!isManager && (
                                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                                        View History
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredMembers.length === 0 && (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <p className="text-muted">No members found matching this filter.</p>
                    </div>
                )}
            </div>

            {/* Device History Modal */}
            {selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '2rem', position: 'relative', border: `1px solid ${getStatusColor(selectedUser.role)}` }}>
                        <button onClick={closeModal} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                        
                        <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Monitor className="text-cyan" /> 
                            {selectedUser.username}'s Device History
                        </h2>
                        <p className="text-secondary" style={{ marginBottom: '2rem' }}>Tracking all hardware fingerprints used by this alias.</p>

                        {loadingHistory ? (
                            <p style={{ textAlign: 'center', padding: '2rem' }}>Loading forensic data...</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {deviceHistory.map((hw, idx) => {
                                    const isCurrent = selectedUser.activeSessionId && idx === 0;

                                    return (
                                        <div key={idx} style={{ 
                                            padding: '1rem', 
                                            background: isCurrent ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-primary)', 
                                            border: `1px solid ${isCurrent ? 'var(--success)' : 'var(--border-subtle)'}`,
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <p style={{ fontFamily: 'var(--mono)', color: 'var(--accent-cyan)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{hw.hardwareId}</p>
                                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>First seen: {new Date(hw.loginAt).toLocaleString()}</p>
                                            </div>
                                            {isCurrent && (
                                                <div style={{ background: 'var(--success)', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                    ACTIVE NOW
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {deviceHistory.length === 0 && <p className="text-muted">No device history found.</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
