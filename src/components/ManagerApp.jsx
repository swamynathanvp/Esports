// Move the existing App.jsx manager logic into this new file
import { useState } from 'react'
import { LayoutDashboard, Users, ShieldAlert, Activity, Menu, X, CalendarDays, LogOut } from 'lucide-react'
import DashboardView from './DashboardView'
import AllMembersView from './AllMembersView'
import RosterView from './RosterView'
import InvitedTeamsView from './InvitedTeamsView'
import RecruitmentView from './RecruitmentView'
import IntegrityView from './IntegrityView'
import ScrimManager from './ScrimManager'

export default function ManagerApp({ onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeGame, setActiveGame] = useState('BGMI');

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'all_members', label: 'All Members', icon: Users },
        { id: 'roster', label: 'Official Teams', icon: ShieldAlert },
        { id: 'invited_teams', label: 'External Teams', icon: Users },
        { id: 'recruitment', label: 'Recruit', icon: Users },
        { id: 'schedule', label: 'Match Schedule', icon: CalendarDays },
        { id: 'integrity', label: 'Integrity Hub', icon: ShieldAlert },
    ];

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'Command Center';
            case 'all_members': return 'Organization Directory';
            case 'roster': return 'Active Roster';
            case 'invited_teams': return 'External Teams';
            case 'schedule': return 'Match Schedule';
            case 'integrity': return 'Integrity Monitor';
            default: return 'Nexus';
        }
    };

    return (
        <div className="app-container">
            {/* Mobile Header Context */}
            <div className="mobile-header" style={{ display: 'none', padding: '1rem', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                <h2 className="text-cyan glow-text" style={{ fontSize: '1.2rem', margin: 0 }}>NEXUS</h2>
                <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
                    <Menu size={24} />
                </button>
            </div>

            {/* Sidebar Navigation */}
            <nav className={`glass-panel sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{
                width: '280px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                margin: '1rem',
                borderRadius: 'var(--radius-lg)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="text-cyan glow-text" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>NEXUS</h2>
                        <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Manager Access</p>
                    </div>
                    {isMobileMenuOpen && (
                        <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Global Game Selector Dropdown Simulator */}
                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Div:</span>
                    <select
                        value={activeGame}
                        onChange={(e) => setActiveGame(e.target.value)}
                        style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                        <option value="BGMI">BGMI</option>
                        <option value="VALORANT">Valorant Mobile</option>
                        <option value="FREEFIRE">Free Fire Max</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const isDanger = item.id === 'integrity';

                        return (
                            <button
                                key={item.id}
                                className={isDanger ? 'btn-danger' : 'btn-primary'}
                                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    background: isActive ? (isDanger ? 'var(--accent-crimson)' : 'var(--accent-cyan)') : 'transparent',
                                    color: isActive ? (isDanger ? 'var(--text-primary)' : 'var(--bg-primary)') : (isDanger ? 'var(--accent-crimson)' : 'var(--accent-cyan)'),
                                    boxShadow: isActive ? (isDanger ? 'var(--shadow-neon-crimson)' : 'var(--shadow-neon)') : 'none',
                                    textAlign: 'left',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Icon size={20} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                        <Activity size={18} className="text-cyan glow-text" />
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Servers Synced</span>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', width: 'fit-content' }}>
                        <LogOut size={16} /> Logout Context
                    </button>
                </div>
            </nav>

            <main className="main-content" style={{ overflowY: 'auto', height: '100vh', paddingBottom: '3rem' }}>
                <header className="dashboard-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10, padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                        <h1>{getHeaderTitle()}</h1>
                        <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Active Division: <span className="text-cyan">{activeGame}</span></p>
                    </div>

                    <div className="glass-panel" style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '50px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)', animation: 'pulse 2s infinite' }}></div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>System Online</span>
                    </div>
                </header>

                <section style={{ flex: 1, marginTop: '1rem', animation: 'fadeIn 0.5s ease' }}>
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'all_members' && <AllMembersView activeGame={activeGame} />}
                    {activeTab === 'roster' && <RosterView activeGame={activeGame} />}
                    {activeTab === 'invited_teams' && <InvitedTeamsView activeGame={activeGame} />}
                    {activeTab === 'recruitment' && <RecruitmentView activeGame={activeGame} />}
                    {activeTab === 'schedule' && <ScrimManager activeGame={activeGame} />}
                    {activeTab === 'integrity' && <IntegrityView />}
                </section>
            </main>
        </div>
    )
}
