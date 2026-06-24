import React, { useState } from 'react';
import { ShieldCheck, Crosshair, Loader2, ArrowLeft } from 'lucide-react';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';

export default function LoginGateway({ onLogin }) {
    const [view, setView] = useState('selection'); // selection, manager, player_login, player_signup
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Manager State
    const [managerUser, setManagerUser] = useState('');
    const [managerPass, setManagerPass] = useState('');

    // Player State
    const [playerUser, setPlayerUser] = useState('');
    const [playerPass, setPlayerPass] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    const handleManagerSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await api.post('/auth/manager-login', { username: managerUser, password: managerPass });
            localStorage.setItem('nexus_token', res.data.token);
            onLogin('manager');
        } catch (err) {
            setError('Invalid Manager Credentials');
        } finally {
            setLoading(false);
        }
    };

    const getHwId = async (username) => {
        if (Capacitor.getPlatform() === 'web') {
            return `mock_hw_${username.toLowerCase()}`; // Deterministic for web testing
        } else {
            const id = await Device.getId();
            return id.identifier;
        }
    };

    const handlePlayerSignUp = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const hwId = await getHwId(playerUser);
            const deviceInfo = { hardwareId: hwId, deviceModel: 'Web Browser', platform: Capacitor.getPlatform() };
            
            const res = await api.post('/auth/register-device', { 
                username: playerUser, 
                password: playerPass,
                inviteCode: inviteCode,
                deviceInfo 
            });
            localStorage.setItem('nexus_token', res.data.token);
            localStorage.setItem('nexus_hwid', hwId);
            localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
            onLogin('player');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const hwId = await getHwId(playerUser);
            const deviceInfo = { hardwareId: hwId, deviceModel: 'Web Browser', platform: Capacitor.getPlatform() };
            
            const res = await api.post('/auth/player-login', { 
                username: playerUser, 
                password: playerPass,
                deviceInfo 
            });
            localStorage.setItem('nexus_token', res.data.token);
            localStorage.setItem('nexus_hwid', hwId);
            localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
            onLogin('player');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 className="text-cyan glow-text" style={{ fontSize: '4rem', margin: 0 }}>NEXUS</h1>
                <p className="text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '4px' }}>Esports Integrity Network</p>
            </div>

            {error && <div style={{ color: 'var(--accent-crimson)', marginBottom: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--accent-crimson)', maxWidth: '400px', textAlign: 'center' }}>{error}</div>}

            {view === 'selection' && (
                <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {/* Manager Card */}
                    <div
                        className="glass-panel"
                        style={{ width: '320px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        onClick={() => { setView('manager'); setError(''); }}
                    >
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                            <Crosshair size={40} className="text-cyan glow-text" />
                        </div>
                        <h2>Org Manager</h2>
                        <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Command center access. Oversee rosters, create test scrims, and monitor team integrity.</p>
                        <div className="btn-primary" style={{ marginTop: '2rem', width: '100%' }}>Select Manager</div>
                    </div>

                    {/* Player Card */}
                    <div
                        className="glass-panel"
                        style={{ width: '320px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        onClick={() => { setView('player_selection'); setError(''); }}
                    >
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                            <ShieldCheck size={40} style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <h2>Player / Recruit</h2>
                        <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>On-device client. Access upcoming scrims, view assigned Room IDs, and activate Integrity Shield.</p>
                        <div className="btn-primary" style={{ marginTop: '2rem', width: '100%', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}>Select Player</div>
                    </div>
                </div>
            )}

            {view === 'player_selection' && (
                <div className="glass-panel" style={{ width: '400px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button type="button" onClick={() => setView('selection')} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Player Access</h2>
                    <div className="btn-primary" style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => setView('player_login')}>
                        Log In to Existing Account
                    </div>
                    <div className="btn-primary" style={{ width: '100%', textAlign: 'center', background: 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }} onClick={() => setView('player_signup')}>
                        Use Invite Code to Register
                    </div>
                </div>
            )}

            {view === 'manager' && (
                <form onSubmit={handleManagerSubmit} className="glass-panel" style={{ width: '400px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column' }}>
                    <button type="button" onClick={() => setView('selection')} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Manager Portal Login</h2>
                    <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: '1.5rem' }}>Hint: Use `admin` / `admin` to access the portal.</p>
                    
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Username</label>
                    <input autoFocus required value={managerUser} onChange={(e)=>setManagerUser(e.target.value)} type="text" style={{ padding: '12px', marginBottom: '1.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />

                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Password</label>
                    <input required value={managerPass} onChange={(e)=>setManagerPass(e.target.value)} type="password" style={{ padding: '12px', marginBottom: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />

                    <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', justifyContent: 'center' }}>
                        {loading ? <Loader2 className="spin" size={20} /> : 'Login to Command Center'}
                    </button>
                </form>
            )}

            {view === 'player_login' && (
                <form onSubmit={handlePlayerLogin} className="glass-panel" style={{ width: '400px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column' }}>
                    <button type="button" onClick={() => setView('player_selection')} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Player Login</h2>
                    
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Username</label>
                    <input required value={playerUser} onChange={(e)=>setPlayerUser(e.target.value)} type="text" style={{ padding: '12px', marginBottom: '1.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />

                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Password</label>
                    <input required value={playerPass} onChange={(e)=>setPlayerPass(e.target.value)} type="password" style={{ padding: '12px', marginBottom: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />

                    <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)' }}>
                        {loading ? <Loader2 className="spin" size={20} /> : 'Log In & Connect'}
                    </button>
                </form>
            )}

            {view === 'player_signup' && (
                <form onSubmit={handlePlayerSignUp} className="glass-panel" style={{ width: '400px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column' }}>
                    <button type="button" onClick={() => setView('player_selection')} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Register New Device</h2>
                    <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: '2rem', lineHeight: 1.5 }}>
                        Registration requires an Invite Code from a manager.
                    </p>
                    
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Invite Code</label>
                    <input required value={inviteCode} onChange={(e)=>setInviteCode(e.target.value)} type="text" placeholder="NX-XXXXXX" style={{ padding: '12px', marginBottom: '1.5rem', background: 'var(--bg-primary)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }} />

                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Username</label>
                    <input required value={playerUser} onChange={(e)=>setPlayerUser(e.target.value)} type="text" style={{ padding: '12px', marginBottom: '1.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />

                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Password</label>
                    <input required value={playerPass} onChange={(e)=>setPlayerPass(e.target.value)} type="password" style={{ padding: '12px', marginBottom: '2rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />


                    <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)' }}>
                        {loading ? <Loader2 className="spin" size={20} /> : 'Register Device & Connect'}
                    </button>
                </form>
            )}
        </div>
    );
}
