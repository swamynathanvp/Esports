import { useState, useEffect } from 'react';
import { ShieldCheck, Crosshair, LogOut, CalendarDays, ShieldAlert, Cpu, Network, FileKey, Smartphone, Activity } from 'lucide-react';
import { io } from 'socket.io-client';
import { Device } from '@capacitor/device';
import { securityService } from '../services/SecurityService';
import api from '../services/api';

export default function PlayerApp({ onLogout }) {
    const [diagnostic, setDiagnostic] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const [scrims, setScrims] = useState([]);
    const [socketInstance, setSocketInstance] = useState(null);
    const [verificationTier, setVerificationTier] = useState('UNVERIFIED');

    // Profile from DB (stored in localStorage during login)
    const storedUser = localStorage.getItem('nexus_user');
    const playerProfile = storedUser ? JSON.parse(storedUser) : { name: 'Unknown', type: 'RECRUIT', sessionId: '' };

    useEffect(() => {
        let socket;
        let heartbeatInterval;

        const initDiagnosticsAndSocket = async () => {
            setIsScanning(true);
            
            // 1. Ask for Phone Permissions
            await securityService.requestRequiredPermissions();
            
            // 2. Run Initial Scan
            await new Promise(resolve => setTimeout(resolve, 2000));
            const initialResults = await securityService.runCompleteDiagnostic();
            setDiagnostic(initialResults);
            setIsScanning(false);

            // 2b. Verify the device with the server (App Attest + install-source check).
            //     This is what stops TestFlight/sideloaded cheat builds from earning trust.
            const tier = await securityService.verifyDevice(api, initialResults);
            setVerificationTier(tier);

            // 3. Connect to the Command Server via WebSockets
            socket = io('http://localhost:5000');
            setSocketInstance(socket);

            // 4. Authenticate the socket with the signed JWT only. The server
            //    derives identity (user, role, hardware) from the token — the client
            //    can no longer claim to be another user or another device.
            const token = localStorage.getItem('nexus_token');
            socket.emit('authenticate', { token });

            socket.on('auth_error', (data) => {
                alert(data.message);
                onLogout(); // Kick to login screen
            });

            socket.on('auth_success', async (data) => {
                console.log(data.message);
                fetchScrims();

                // 5. Establish continuous 30s heartbeat
                socket.emit('integrity_heartbeat', initialResults);
                heartbeatInterval = setInterval(async () => {
                    const newResults = await securityService.runCompleteDiagnostic();
                    setDiagnostic(newResults);
                    socket.emit('integrity_heartbeat', newResults);
                }, 30000);
            });

            socket.on('scrims_updated', () => {
                // Auto-refresh when a manager creates/updates/pushes a scrim.
                fetchScrims();
            });
        };

        initDiagnosticsAndSocket();

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (socket) socket.disconnect();
        };
    }, []);

    const fetchScrims = async () => {
        try {
            const res = await api.get('/scrims/upcoming');
            const formattedScrims = await Promise.all(res.data.map(async (s) => {
                const releaseTime = new Date(s.releaseSchedule[0]?.releaseTime || Date.now());
                const isUnlocked = releaseTime < new Date();

                let roomId = isUnlocked ? 'Hidden' : 'Hidden';
                let password = isUnlocked ? 'Hidden' : 'Hidden';

                // Credentials are released by the server only if we're eligible
                // (assigned + released + trust score 100). The client cannot force this.
                if (isUnlocked) {
                    try {
                        const credRes = await api.get(`/scrims/credentials/${s._id}`);
                        roomId = credRes.data.roomId || 'Pending push';
                        password = credRes.data.password || 'Pending push';
                    } catch (credErr) {
                        const reason = credErr.response?.data?.error;
                        roomId = password = reason === 'INTEGRITY_BLOCK' ? 'Integrity blocked'
                            : reason === 'VERIFICATION_TIER_TOO_LOW' ? 'Device not verified'
                            : reason === 'PENDING' ? 'Pending push'
                            : 'Locked';
                    }
                }

                return {
                    id: s._id,
                    name: s.title,
                    time: releaseTime.toLocaleString(),
                    isUnlocked,
                    roomId,
                    password,
                    status: isUnlocked ? "Unlocked" : "Scheduled"
                };
            }));
            setScrims(formattedScrims);
        } catch (err) {
            console.error("Failed fetching live scrims:", err);
            if (err.response?.status === 401) {
                alert('Session Expired');
                onLogout();
            }
        }
    };

    const getStatusColor = (isFlagged) => isFlagged ? 'var(--accent-crimson)' : 'var(--success)';
    const getStatusText = (isFlagged) => isFlagged ? 'FLAGGED' : 'CLEAN';
    const displayRole = playerProfile.role || playerProfile.type;

    return (
        <div className="app-container" style={{ flexDirection: 'column', minHeight: '100vh', padding: '1rem', maxWidth: '600px', margin: '0 auto', borderInline: '1px solid var(--border-subtle)' }}>
            {/* Player Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <div>
                    <h2 className="text-cyan glow-text" style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>{playerProfile.username || playerProfile.name}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: displayRole === 'OFFICIAL' ? 'var(--accent-cyan)' : 'var(--accent-purple)', color: displayRole === 'OFFICIAL' ? 'var(--bg-primary)' : '#fff', borderRadius: '4px', fontWeight: 'bold' }}>
                            {displayRole}
                        </span>
                        <span style={{
                            fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold',
                            border: '1px solid',
                            color: verificationTier === 'MANAGED' ? 'var(--success)' : verificationTier === 'ATTESTED' ? 'var(--accent-cyan)' : 'var(--accent-crimson)',
                            borderColor: verificationTier === 'MANAGED' ? 'var(--success)' : verificationTier === 'ATTESTED' ? 'var(--accent-cyan)' : 'var(--accent-crimson)',
                        }}>
                            {verificationTier === 'MANAGED' ? 'MANAGED DEVICE' : verificationTier === 'ATTESTED' ? 'ATTESTED' : 'UNVERIFIED'}
                        </span>
                    </div>
                </div>
                <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
                    <LogOut size={20} />
                </button>
            </header>

            {/* Primary Visual: Integrity Shield */}
            <div
                className="glass-panel"
                style={{
                    padding: '3rem 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    borderColor: isScanning ? 'var(--accent-cyan)' : (diagnostic?.trustScore === 100 ? 'var(--success)' : 'var(--accent-crimson)'),
                    boxShadow: isScanning ? '0 0 30px rgba(0, 240, 255, 0.1)' : (diagnostic?.trustScore === 100 ? '0 0 30px rgba(16, 185, 129, 0.1)' : '0 0 30px rgba(255, 0, 60, 0.1)'),
                    marginBottom: '2rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.5s ease'
                }}
            >
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', borderRadius: '50%',
                    background: isScanning ? 'var(--accent-cyan)' : (diagnostic?.trustScore === 100 ? 'var(--success)' : 'var(--accent-crimson)'),
                    filter: 'blur(80px)', opacity: 0.1, animation: isScanning ? 'spin 2s linear infinite' : 'pulse 3s infinite'
                }}></div>

                {isScanning ? (
                    <Activity size={64} style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))', animation: 'pulse 1s infinite' }} />
                ) : diagnostic?.trustScore === 100 ? (
                    <ShieldCheck size={64} style={{ color: 'var(--success)', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.5))' }} />
                ) : (
                    <ShieldAlert size={64} style={{ color: 'var(--accent-crimson)', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(255, 0, 60, 0.5))' }} />
                )}

                <h2 style={{
                    color: isScanning ? 'var(--accent-cyan)' : (diagnostic?.trustScore === 100 ? 'var(--success)' : 'var(--accent-crimson)'),
                    textShadow: isScanning ? '0 0 10px rgba(0, 240, 255, 0.5)' : (diagnostic?.trustScore === 100 ? '0 0 10px rgba(16, 185, 129, 0.5)' : '0 0 10px rgba(255, 0, 60, 0.5)'),
                    marginBottom: '0.5rem'
                }}>
                    {isScanning ? 'DIAGNOSTIC IN PROGRESS' : (diagnostic?.trustScore === 100 ? 'SHIELD ACTIVE' : 'INTEGRITY COMPROMISED')}
                </h2>

                {!isScanning && (
                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Trust Score: <span style={{ fontWeight: 'bold', color: diagnostic?.trustScore === 100 ? 'var(--success)' : 'var(--warning)' }}>{diagnostic?.trustScore}/100</span></p>
                )}
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>Strict 'No-Ban' API compliance. Zero memory inspection.</p>
            </div>

            {/* Diagnostic Granular Breakdown */}
            {!isScanning && diagnostic && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Native Device Signatures</h3>
                    <div className="grid-2-col" style={{ gap: '1rem' }}>

                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Cpu size={24} color={getStatusColor(diagnostic.isRooted)} />
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>OS Integrity</p>
                                <p style={{ color: getStatusColor(diagnostic.isRooted), fontSize: '0.85rem', fontWeight: 'bold' }}>{getStatusText(diagnostic.isRooted)}</p>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <FileKey size={24} color={getStatusColor(diagnostic.isSideloaded)} />
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Install Source</p>
                                <p style={{ color: getStatusColor(diagnostic.isSideloaded), fontSize: '0.85rem', fontWeight: 'bold' }}>{getStatusText(diagnostic.isSideloaded)}</p>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Network size={24} color={getStatusColor(diagnostic.isVpnActive)} />
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Network (VPN)</p>
                                <p style={{ color: getStatusColor(diagnostic.isVpnActive), fontSize: '0.85rem', fontWeight: 'bold' }}>{getStatusText(diagnostic.isVpnActive)}</p>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Smartphone size={24} color={getStatusColor(diagnostic.isDevModeActive)} />
                            <div>
                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>ADB / Debug</p>
                                <p style={{ color: getStatusColor(diagnostic.isDevModeActive), fontSize: '0.85rem', fontWeight: 'bold' }}>{getStatusText(diagnostic.isDevModeActive)}</p>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Match Feed */}
            {!isScanning && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <CalendarDays size={20} className="text-cyan" />
                        <h3 style={{ margin: 0 }}>My Upcoming Scrims</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {scrims.map(scrim => (
                            <div key={scrim.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: scrim.isUnlocked ? '4px solid var(--accent-cyan)' : '4px solid var(--border-subtle)', opacity: diagnostic?.trustScore === 100 ? 1 : 0.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{scrim.name}</h4>
                                        <p className="text-secondary" style={{ fontSize: '0.85rem' }}>{scrim.time}</p>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: scrim.isUnlocked ? 'var(--accent-bg)' : 'var(--bg-primary)', color: scrim.isUnlocked ? 'var(--accent-cyan)' : 'var(--text-muted)', borderRadius: '12px', border: '1px solid', borderColor: scrim.isUnlocked ? 'var(--accent-border)' : 'var(--border-subtle)' }}>
                                        {diagnostic?.trustScore === 100 ? scrim.status : 'ACCESS BLOCKED'}
                                    </span>
                                </div>

                                {scrim.isUnlocked && diagnostic?.trustScore === 100 ? (
                                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)' }}>
                                        <p className="text-success" style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Credentials Unlocked</p>
                                        <div className="grid-2-col" style={{ gap: '1rem' }}>
                                            <div>
                                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Room ID</p>
                                                <code style={{ fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', padding: 0 }}>{scrim.roomId}</code>
                                            </div>
                                            <div>
                                                <p className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Password</p>
                                                <code style={{ fontSize: '1.2rem', color: 'var(--text-primary)', background: 'transparent', padding: 0 }}>{scrim.password}</code>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                            {diagnostic?.trustScore === 100
                                                ? (displayRole === 'RECRUIT' ? `Credentials unlock based on schedule.` : 'Credentials unlock 15 minutes before match.')
                                                : 'Cannot unlock. Resolve integrity flags.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {scrims.length === 0 && (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p className="text-muted">No upcoming scrims.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
        @keyframes spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
      `}</style>
        </div>
    );
}
