'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

const positionLabels: Record<string, { label: string; class: string }> = {
    CHAMPION: { label: 'Campeón', class: 'position-champion' },
    FINALIST: { label: 'Finalista', class: 'position-finalist' },
    SEMIFINALIST: { label: 'Semifinalista', class: 'position-sf' },
    QUARTERFINALIST: { label: 'Cuartos de Final', class: '' },
    ROUND_OF_16: { label: 'Octavos', class: '' },
    PARTICIPANT: { label: 'Participante', class: '' },
};

const getLevelBadge = (level: string) => {
    if (level?.includes('1000')) return <span className="badge-level badge-level-1000">1000</span>;
    if (level?.includes('500')) return <span className="badge-level badge-level-500">500</span>;
    return <span className="badge-level badge-level-250">250</span>;
};

export default function PlayerProfilePage() {
    const params = useParams();
    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = parseInt(params.id as string);
        if (!id) return;
        api.getPlayer(id).then(setPlayer).catch(console.error).finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return <div className="loading"><div className="spinner" /></div>;
    if (!player) return <div className="container"><div className="empty-state"><p>Jugador no encontrado.</p></div></div>;

    const initials = `${player.firstName?.[0] || ''}${player.lastName?.[0] || ''}`.toUpperCase();
    const tournaments = player.tournaments || [];
    const bestResult = tournaments.length > 0
        ? tournaments.reduce((best: any, t: any) => {
            const order = ['CHAMPION', 'FINALIST', 'SEMIFINALIST', 'QUARTERFINALIST', 'ROUND_OF_16', 'PARTICIPANT'];
            return order.indexOf(t.position) < order.indexOf(best.position) ? t : best;
        }, tournaments[0])
        : null;

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)' }}>
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <Link href="/">Inicio</Link>
                <span className="separator">/</span>
                <Link href="/search">Jugadores</Link>
                <span className="separator">/</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{player.firstName} {player.lastName}</span>
            </div>

            {/* Profile Card */}
            <div className="profile-card slide-up">
                <div className="avatar avatar-xl avatar-blue">{initials}</div>
                <div className="profile-info">
                    <h1>
                        {player.firstName} {player.lastName}
                        <span className="badge-category" style={{ fontSize: 'var(--font-size-xs)' }}>{player.categoryName}</span>
                    </h1>
                    <div className="profile-meta">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            {player.localityName}
                        </span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            {player.handedness === 'LEFT' ? 'Zurdo' : 'Diestro'}
                        </span>
                    </div>
                </div>
                <div className="profile-actions">
                    <button className="btn btn-secondary btn-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                        Compartir Perfil
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid-3 fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card card-stat">
                    <div className="stat-label">PUNTOS TOTALES (12 MESES)</div>
                    <div className="stat-value" style={{ color: 'var(--blue-600)' }}>{player.totalPoints12m?.toLocaleString() || 0}</div>
                </div>
                <div className="card card-stat">
                    <div className="stat-label">TORNEOS JUGADOS</div>
                    <div className="stat-value">{tournaments.length}</div>
                </div>
                <div className="card card-stat">
                    <div className="stat-label">MEJOR RESULTADO</div>
                    <div className="stat-value" style={{ fontSize: 'var(--font-size-2xl)' }}>
                        {bestResult ? positionLabels[bestResult.position]?.label || bestResult.position : '—'}
                    </div>
                    {bestResult && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{bestResult.tournamentName}</div>}
                </div>
            </div>

            {/* Tournament History */}
            <section className="section fade-in" style={{ paddingTop: 0 }}>
                <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        Historial de Torneos
                    </h2>
                </div>

                {tournaments.length === 0 ? (
                    <div className="empty-state"><p>Sin participaciones registradas.</p></div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>TORNEO</th>
                                    <th>FECHA</th>
                                    <th>NIVEL</th>
                                    <th>RESULTADO</th>
                                    <th style={{ textAlign: 'right' }}>PUNTOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tournaments.map((t: any, i: number) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-500)" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                                                <span style={{ fontWeight: 600 }}>{t.tournamentName}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td>{getLevelBadge(t.level)}</td>
                                        <td>
                                            <span className={positionLabels[t.position]?.class || ''}>
                                                {t.position === 'CHAMPION' && '🏆 '}{positionLabels[t.position]?.label || t.position}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className="points-badge">+{t.points || 0}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Point History */}
                {player.pointHistory?.length > 0 && (
                    <>
                        <h3 className="section-title" style={{ marginTop: 'var(--space-xl)' }}>Historial de Puntos</h3>
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>TORNEO</th><th>CATEGORÍA</th><th>MOTIVO</th><th style={{ textAlign: 'right' }}>PUNTOS</th><th>FECHA</th></tr></thead>
                                <tbody>
                                    {player.pointHistory.map((m: any) => (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 600 }}>{m.tournamentName}</td>
                                            <td>{m.category}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{m.reason}</td>
                                            <td style={{ textAlign: 'right' }}><span className="points-badge">+{m.points}</span></td>
                                            <td style={{ color: 'var(--text-muted)' }}>{new Date(m.date).toLocaleDateString('es-AR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
