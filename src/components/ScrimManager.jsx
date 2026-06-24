import React, { useState, useEffect } from 'react';
import { Trash2, Edit3, Send, X } from 'lucide-react';
import api from '../services/api';

export default function ScrimManager({ activeGame }) {
    const [scrims, setScrims] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State (No RoomID/Password for creation anymore)
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Selection state
    const [allUsers, setAllUsers] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);

    // Push Modal State
    const [pushModalData, setPushModalData] = useState(null);
    const [pushRoomId, setPushRoomId] = useState('');
    const [pushPassword, setPushPassword] = useState('');

    useEffect(() => {
        fetchUpcomingScrims();
        fetchSelections();
    }, []);

    const fetchUpcomingScrims = async () => {
        try {
            const res = await api.get('/scrims/upcoming');
            setScrims(res.data);
        } catch (error) {
            console.error('Failed to fetch scrims:', error);
        }
    };

    const fetchSelections = async () => {
        try {
            const [usersRes, teamsRes] = await Promise.all([
                api.get('/users/all'),
                api.get('/teams/all')
            ]);
            setAllUsers(usersRes.data);
            setAllTeams(teamsRes.data);
        } catch (error) {
            console.error('Failed to fetch users/teams:', error);
        }
    };

    const resetForm = () => {
        setTitle('');
        setSelectedParticipants([]);
        setSelectedTeams([]);
        setEditingId(null);
        setIsCreating(false);
    };

    const handleCreateOrUpdate = async () => {
        if (!title) return;
        setIsLoading(true);

        try {
            if (editingId) {
                // Update
                await api.put(`/scrims/update/${editingId}`, {
                    title,
                    participants: selectedParticipants,
                    teams: selectedTeams
                });
            } else {
                // Create
                const releaseTime = new Date();
                releaseTime.setMinutes(releaseTime.getMinutes() + 5);

                await api.post('/scrims/create', {
                    title,
                    game: activeGame,
                    releaseSchedule: [{ targetTier: 'SELECTED', releaseTime }],
                    participants: selectedParticipants,
                    teams: selectedTeams
                });
            }
            resetForm();
            fetchUpcomingScrims();
        } catch (error) {
            console.error('Failed to save scrim:', error);
            alert(error.response?.data?.error || 'Failed to create match.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (scrim) => {
        setEditingId(scrim._id);
        setTitle(scrim.title);
        setSelectedParticipants(scrim.participants || []);
        setSelectedTeams(scrim.teams || []);
        setIsCreating(true);
    };

    const handleEndGame = async (id) => {
        if (!window.confirm("Are you sure you want to end this game? (This will remove it from active tracking)")) return;
        try {
            await api.delete(`/scrims/end/${id}`);
            fetchUpcomingScrims();
        } catch (err) {
            console.error('Failed to end game', err);
        }
    };

    const triggerPushFlow = (scrim) => {
        setPushModalData(scrim);
        setPushRoomId('');
        setPushPassword('');
    };

    const submitPushCredentials = async () => {
        if (!pushModalData || !pushRoomId || !pushPassword) return alert("Please enter both Room ID and Password");
        
        try {
            await api.post(`/scrims/push/${pushModalData._id}`, {
                roomId: pushRoomId,
                password: pushPassword
            });
            alert("Credentials securely pushed to clients!");
            setPushModalData(null);
            fetchUpcomingScrims();
        } catch (err) {
            console.error('Failed to push credentials', err);
            alert("Error pushing credentials");
        }
    };

    const toggleParticipant = (id) => {
        setSelectedParticipants(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleTeam = (id) => {
        setSelectedTeams(prev => 
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Match & Scrim Management</h3>
                    <p className="text-secondary">Create lobbies and securely distribute Room IDs to players via their client app.</p>
                </div>
                <button className="btn-primary" onClick={() => { if(isCreating) resetForm(); else setIsCreating(true); }}>
                    {isCreating ? 'Cancel' : '+ Create Scrim'}
                </button>
            </div>

            {isCreating && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--accent-cyan)' }}>
                    <h4 className="text-cyan glow-text" style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Match' : 'Create New Match'}</h4>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Match Title</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="e.g. Tryouts Lobby 1" style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />
                    </div>

                    <div className="grid-2-col" style={{ marginBottom: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select Teams (Squads/Duos)</label>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '0.5rem' }}>
                                {allTeams.map(t => (
                                    <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTeams.includes(t._id)}
                                            onChange={() => toggleTeam(t._id)}
                                        />
                                        <span>{t.name} <span className="text-muted" style={{fontSize:'0.7rem'}}>({t.type})</span></span>
                                    </label>
                                ))}
                                {allTeams.length === 0 && <p className="text-muted" style={{padding: '8px', fontSize: '0.8rem'}}>No teams created yet.</p>}
                            </div>
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select Individual Players (Solo)</label>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '0.5rem' }}>
                                {allUsers.map(u => (
                                    <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedParticipants.includes(u._id)}
                                            onChange={() => toggleParticipant(u._id)}
                                        />
                                        <span>{u.username} <span className="text-muted" style={{fontSize:'0.7rem'}}>({u.role})</span></span>
                                    </label>
                                ))}
                                {allUsers.length === 0 && <p className="text-muted" style={{padding: '8px', fontSize: '0.8rem'}}>No individual players available.</p>}
                            </div>
                        </div>
                    </div>

                    {!editingId && <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>* Credentials can be assigned to the match later via the "Push Credentials" button.</p>}
                    <button onClick={handleCreateOrUpdate} disabled={isLoading || !title.trim()} className={`btn-primary ${!title.trim() ? 'disabled' : ''}`} style={{ width: '100%', opacity: !title.trim() ? 0.5 : 1, cursor: !title.trim() ? 'not-allowed' : 'pointer' }}>
                        {isLoading ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Match')}
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', marginTop: '1rem' }}>Active Matches ({activeGame})</h4>
                {scrims.length === 0 && <p className="text-muted">No upcoming matches detected via the Nexus Server.</p>}
                {scrims.map((scrim) => (
                    <div key={scrim._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--accent-cyan)' }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {scrim.title}
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                    LIVE
                                </span>
                            </h4>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                {scrim.participants?.length || 0} Solos | {scrim.teams?.length || 0} Teams
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => triggerPushFlow(scrim)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                                <Send size={16} /> Push Credentials
                            </button>
                            <button onClick={() => handleEditClick(scrim)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Edit3 size={16} /> Edit Match
                            </button>
                            <button onClick={() => handleEndGame(scrim._id)} className="btn-danger" style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Trash2 size={16} /> End Game
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Push Credentials Modal */}
            {pushModalData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem', position: 'relative', border: '1px solid var(--accent-purple)' }}>
                        <button onClick={() => setPushModalData(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Send size={24} className="text-purple" />
                            <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>Push Credentials</h3>
                        </div>
                        
                        <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
                            Enter the details for <strong style={{color: 'white'}}>{pushModalData.title}</strong>. This will instantly dispatch to all assigned players.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Room ID</label>
                            <input 
                                value={pushRoomId} 
                                onChange={(e) => setPushRoomId(e.target.value)} 
                                type="text" 
                                placeholder="Enter Room ID" 
                                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', borderRadius: '4px', fontFamily: 'var(--mono)' }} 
                            />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Password</label>
                            <input 
                                value={pushPassword} 
                                onChange={(e) => setPushPassword(e.target.value)} 
                                type="text" 
                                placeholder="Enter Password" 
                                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', borderRadius: '4px', fontFamily: 'var(--mono)' }} 
                            />
                        </div>

                        <button onClick={submitPushCredentials} className="btn-primary" style={{ width: '100%', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', color: '#fff', padding: '12px', fontSize: '1rem', fontWeight: 'bold' }}>
                            Confirm Push
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
