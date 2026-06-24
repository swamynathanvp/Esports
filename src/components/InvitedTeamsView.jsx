import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, ShieldAlert, X, Trash2, Plus } from 'lucide-react';
import api from '../services/api';

export default function InvitedTeamsView({ activeGame }) {
    const [filter, setFilter] = useState('SQUAD');
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create Team Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    // Manage Team Modal
    const [managingTeam, setManagingTeam] = useState(null);
    const [allInvitedUsers, setAllInvitedUsers] = useState([]);
    const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

    useEffect(() => {
        fetchTeams();
        fetchAllInvitedUsers();
    }, []);

    const fetchTeams = async () => {
        try {
            const res = await api.get('/teams/all');
            setTeams(res.data.filter(t => t.teamStatus === 'EXTERNAL'));
        } catch (error) {
            console.error('Failed to fetch teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllInvitedUsers = async () => {
        try {
            const res = await api.get('/users/all');
            setAllInvitedUsers(res.data.filter(u => u.role === 'INVITED'));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName) return;
        try {
            await api.post('/teams/create', { name: newTeamName, type: filter, teamStatus: 'EXTERNAL' });
            setShowCreateModal(false);
            setNewTeamName('');
            fetchTeams();
        } catch (error) {
            console.error('Failed to create team', error);
        }
    };

    const handleRemoveMember = async (teamId, userId) => {
        try {
            await api.post('/teams/remove-member', { teamId, userId });
            fetchTeams();
            
            if (managingTeam && managingTeam._id === teamId) {
                setManagingTeam(prev => ({
                    ...prev,
                    members: prev.members.filter(m => m._id !== userId)
                }));
            }
        } catch (error) {
            console.error('Failed to remove member', error);
        }
    };

    const handleAddMember = async () => {
        if (!managingTeam || !selectedUserToAdd) return;
        try {
            const res = await api.post('/teams/add-member', { teamId: managingTeam._id, userId: selectedUserToAdd });
            fetchTeams();
            setManagingTeam(res.data);
            setSelectedUserToAdd('');
        } catch (error) {
            console.error('Failed to add member', error);
            alert('Failed to add member. Please try again.');
        }
    };

    const renderSection = (team) => {
        const players = team.members;
        
        return (
            <div key={team._id} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        {team.name} ({team.type})
                    </h4>
                    <button onClick={() => setManagingTeam(team)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        Manage Details
                    </button>
                </div>
                
                {players.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No players assigned to this team yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {players.map((p, idx) => (
                            <div key={p._id || idx} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid var(--border-subtle)` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '25%' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid var(--text-muted)` }}></div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{p.username}</h3>
                                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>{p.role}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '2rem', flex: 1, justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Trust Score</p>
                                        <p style={{ fontWeight: '600', color: p.trustScore === 100 ? 'var(--success)' : 'var(--accent-crimson)' }}>
                                            {p.trustScore === 100 ? <ShieldCheck size={14} className="text-success" style={{marginRight: '4px', verticalAlign: 'text-bottom'}} /> : <ShieldAlert size={14} className="text-crimson" style={{marginRight: '4px', verticalAlign: 'text-bottom'}} />}
                                            {p.trustScore}/100
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div>Loading external teams...</div>;

    const filteredTeams = teams.filter(t => t.type === filter);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>External Teams ({activeGame})</h3>
                    <p className="text-secondary">Manage temporary team configurations for INVITED players.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                    <UserPlus size={18} /> {filter === 'SQUAD' ? 'Add Squad' : 'Add Duo'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => setFilter('SQUAD')} className={filter === 'SQUAD' ? 'btn-primary' : ''} style={{ padding: '8px 16px', background: filter === 'SQUAD' ? 'var(--accent-cyan)' : 'transparent', color: filter === 'SQUAD' ? 'var(--bg-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Squads (4-Man)</button>
                <button onClick={() => setFilter('DUO')} className={filter === 'DUO' ? 'btn-primary' : ''} style={{ padding: '8px 16px', background: filter === 'DUO' ? 'var(--accent-cyan)' : 'transparent', color: filter === 'DUO' ? 'var(--bg-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Duos (2-Man)</button>
            </div>

            {filter === 'SQUAD' && (
                <>
                    <h3 style={{ color: 'var(--accent-purple)', margin: '1rem 0 1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Active Squad Formations</h3>
                    {filteredTeams.map(renderSection)}
                    {filteredTeams.length === 0 && <p className="text-muted">No external squads formed yet.</p>}
                </>
            )}

            {filter === 'DUO' && (
                <>
                    <h3 style={{ color: 'var(--accent-cyan)', margin: '1rem 0 1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Active Duo Formations</h3>
                    {filteredTeams.map(renderSection)}
                    {filteredTeams.length === 0 && <p className="text-muted">No external duos formed yet.</p>}
                </>
            )}

            {/* Create Team Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem', position: 'relative', border: `1px solid var(--text-secondary)` }}>
                        <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Create New External Team</h3>
                        
                        <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Team Name</label>
                        <input 
                            value={newTeamName} 
                            onChange={(e) => setNewTeamName(e.target.value)} 
                            type="text" 
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px', marginBottom: '1rem' }} 
                        />
                        
                        <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Team Type</label>
                        <input 
                            value={filter === 'SQUAD' ? 'Squad (4-Man)' : 'Duo (2-Man)'} 
                            disabled
                            type="text" 
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: '4px', marginBottom: '1.5rem', opacity: 0.7 }}
                        />

                        <button onClick={handleCreateTeam} className="btn-primary" style={{ width: '100%', background: 'var(--text-secondary)', borderColor: 'var(--text-secondary)', color: 'var(--bg-primary)' }}>Create {filter === 'SQUAD' ? 'Squad' : 'Duo'}</button>
                    </div>
                </div>
            )}

            {/* Manage Team Modal */}
            {managingTeam && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', position: 'relative', border: `1px solid var(--text-secondary)` }}>
                        <button onClick={() => setManagingTeam(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Manage: {managingTeam.name}</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Type: {managingTeam.type}</p>

                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                            <select 
                                value={selectedUserToAdd}
                                onChange={(e) => setSelectedUserToAdd(e.target.value)}
                                style={{ flex: 1, padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }}
                            >
                                <option value="">-- Select Invited Player to Add --</option>
                                {allInvitedUsers
                                    .filter(u => !managingTeam.members.some(m => m._id === u._id))
                                    .map(u => (
                                        <option key={u._id} value={u._id}>{u.username}</option>
                                    ))
                                }
                            </select>
                            <button onClick={handleAddMember} disabled={!selectedUserToAdd} className="btn-primary" style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--text-secondary)', borderColor: 'var(--text-secondary)', color: 'var(--bg-primary)' }}>
                                <Plus size={16}/> Add
                            </button>
                        </div>

                        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Current Members</h4>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                            {managingTeam.members.map(m => (
                                <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span>{m.username}</span>
                                    <button onClick={() => handleRemoveMember(managingTeam._id, m._id)} className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Trash2 size={14}/> Remove
                                    </button>
                                </div>
                            ))}
                            {managingTeam.members.length === 0 && <p className="text-muted" style={{ padding: '10px' }}>No members added yet.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
