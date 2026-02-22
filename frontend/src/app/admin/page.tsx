'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const sidebarItems = [
    { id: 'overview', label: 'Vista General', icon: '📊' },
    { id: 'clubs', label: 'Clubes Pendientes', icon: '🏢' },
    { id: 'tournaments', label: 'Torneos Recientes', icon: '🏆' },
    { id: 'movements', label: 'Movimientos', icon: '📈' },
];

export default function AdminPage() {
    const { user, token } = useAuth();
    const [activeSection, setActiveSection] = useState('overview');
    const [pendingClubs, setPendingClubs] = useState<any[]>([]);
    const [recentMovements, setRecentMovements] = useState<any[]>([]);
    const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
    const [corrections, setCorrections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (!token) return;
        Promise.all([
            api.getPendingClubs(token).catch(() => []),
            api.getRecentMovements(token).catch(() => []),
            api.getRecentTournaments(token).catch(() => []),
            api.getCorrections(token).catch(() => []),
        ]).then(([clubs, movements, tournaments, corrs]) => {
            setPendingClubs(clubs || []); setRecentMovements(movements || []);
            setRecentTournaments(tournaments || []); setCorrections(corrs || []);
        }).finally(() => setLoading(false));
    }, [token]);

    const handleApprove = async (clubId: number) => {
        if (!token) return;
        try { await api.approveClub(token, clubId); setPendingClubs(pendingClubs.filter((c) => c.id !== clubId)); setMsg('Club aprobado.'); }
        catch (err: any) { setMsg(err.message); }
    };

    const handleReject = async (clubId: number) => {
        if (!token) return;
        try { await api.rejectClub(token, clubId); setPendingClubs(pendingClubs.filter((c) => c.id !== clubId)); setMsg('Club rechazado.'); }
        catch (err: any) { setMsg(err.message); }
    };

    const handleVoid = async (movementId: number) => {
        if (!token) return;
        if (!confirm('¿Estás seguro de anular este movimiento de puntos?')) return;
        try { await api.voidPoints(token, movementId, 'Anulado por admin'); setRecentMovements(recentMovements.filter((m) => m.id !== movementId)); setMsg('Movimiento anulado.'); }
        catch (err: any) { setMsg(err.message); }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-brand">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M12 8v8M8 12h8" /></svg>
                    Admin Panel
                </div>
                <div className="sidebar-section">
                    <div className="sidebar-section-title">MENÚ</div>
                    {sidebarItems.map((item) => (
                        <div key={item.id} className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`} onClick={() => setActiveSection(item.id)}>
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                            {item.id === 'clubs' && pendingClubs.length > 0 && <span className="sidebar-badge">{pendingClubs.length}</span>}
                        </div>
                    ))}
                </div>
                <div className="sidebar-section" style={{ marginTop: 'auto' }}>
                    <div className="help-card">
                        <h3>¿Necesitas Ayuda?</h3>
                        <p>Consultá la documentación o abrí un ticket.</p>
                        <button className="btn btn-sm">Abrir Ticket</button>
                    </div>
                </div>
            </aside>

            {/* Content */}
            <div className="admin-content">
                {msg && <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 'var(--space-md)' }}>{msg}</div>}

                {activeSection === 'overview' && (
                    <div className="fade-in">
                        <div className="admin-content-header">
                            <div>
                                <h1>Vista General</h1>
                                <p>Bienvenido al panel de administración, {user?.email?.split('@')[0]}</p>
                            </div>
                        </div>

                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="card card-stat">
                                <div className="card-stat-icon blue">🏢</div>
                                <div className="stat-label">CLUBES PENDIENTES</div>
                                <div className="stat-value">{pendingClubs.length}</div>
                            </div>
                            <div className="card card-stat">
                                <div className="card-stat-icon green">🏆</div>
                                <div className="stat-label">TORNEOS RECIENTES</div>
                                <div className="stat-value">{recentTournaments.length}</div>
                            </div>
                            <div className="card card-stat">
                                <div className="card-stat-icon yellow">📈</div>
                                <div className="stat-label">MOVIMIENTOS</div>
                                <div className="stat-value">{recentMovements.length}</div>
                            </div>
                            <div className="card card-stat">
                                <div className="card-stat-icon red">📋</div>
                                <div className="stat-label">CORRECCIONES</div>
                                <div className="stat-value">{corrections.length}</div>
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="card">
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    Clubes Pendientes
                                    {pendingClubs.length > 0 && <span className="badge badge-pending">{pendingClubs.length}</span>}
                                </h3>
                                {pendingClubs.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No hay clubes pendientes.</p>
                                ) : pendingClubs.slice(0, 3).map((club) => (
                                    <div key={club.id} style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{club.clubName || club.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{club.managerName} · {club.localityName}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(club.id)}>✓</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(club.id)}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="card">
                                <h3 className="card-title">Actividad Reciente</h3>
                                {recentTournaments.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Sin actividad reciente.</p>
                                ) : recentTournaments.slice(0, 5).map((t: any, i: number) => (
                                    <div key={i} style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <div className="card-stat-icon green" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>🏆</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{t.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('es-AR')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'clubs' && (
                    <div className="fade-in">
                        <div className="admin-content-header"><h1>Clubes Pendientes de Aprobación</h1></div>
                        {pendingClubs.length === 0 ? (
                            <div className="empty-state"><p>No hay clubes pendientes de aprobación.</p></div>
                        ) : (
                            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                                {pendingClubs.map((club) => (
                                    <div key={club.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                                        <div>
                                            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-xs)' }}>{club.clubName || club.name}</h3>
                                            <div style={{ display: 'flex', gap: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                <span>📧 {club.email}</span>
                                                <span>👤 {club.managerName}</span>
                                                <span>📍 {club.localityName}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            <button className="btn btn-success" onClick={() => handleApprove(club.id)}>Aprobar</button>
                                            <button className="btn btn-danger" onClick={() => handleReject(club.id)}>Rechazar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'tournaments' && (
                    <div className="fade-in">
                        <div className="admin-content-header"><h1>Torneos Recientes</h1></div>
                        {recentTournaments.length === 0 ? (
                            <div className="empty-state"><p>Sin torneos recientes.</p></div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead><tr><th>TORNEO</th><th>FECHA</th><th>NIVEL</th><th>ESTADO</th></tr></thead>
                                    <tbody>
                                        {recentTournaments.map((t: any, i: number) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{t.name}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString('es-AR')}</td>
                                                <td><span className={`badge-level badge-level-${t.level}`}>{t.level}</span></td>
                                                <td><span className={`badge ${t.status === 'CONFIRMED' ? 'badge-approved' : 'badge-draft'}`}>{t.status || 'Draft'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'movements' && (
                    <div className="fade-in">
                        <div className="admin-content-header"><h1>Movimientos de Puntos Recientes</h1></div>
                        {recentMovements.length === 0 ? (
                            <div className="empty-state"><p>Sin movimientos recientes.</p></div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead><tr><th>JUGADOR</th><th>TORNEO</th><th>MOTIVO</th><th style={{ textAlign: 'right' }}>PUNTOS</th><th>FECHA</th><th></th></tr></thead>
                                    <tbody>
                                        {recentMovements.map((m: any) => (
                                            <tr key={m.id}>
                                                <td style={{ fontWeight: 600 }}>{m.playerName}</td>
                                                <td>{m.tournamentName}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{m.reason}</td>
                                                <td style={{ textAlign: 'right' }}><span className="points-badge">+{m.points}</span></td>
                                                <td style={{ color: 'var(--text-muted)' }}>{new Date(m.date).toLocaleDateString('es-AR')}</td>
                                                <td><button className="btn btn-danger btn-sm" onClick={() => handleVoid(m.id)}>Anular</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
