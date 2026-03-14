'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MapPin, User, Share2, Trophy, Clock, Award, Calendar } from 'lucide-react';

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
    if (!player) return <div className="container" style={{ paddingTop: 'var(--space-xl)' }}><div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}><User size={40} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} /><p style={{ color: 'var(--text-muted)' }}>Jugador no encontrado.</p></div></div>;

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
                            <MapPin size={14} />
                            {player.localityName}
                        </span>
                        <span>
                            <User size={14} />
                            {player.handedness === 'LEFT' ? 'Zurdo' : player.handedness === 'AMBIDEXTROUS' ? 'Ambidiestro' : 'Diestro'}
                        </span>
                        {player.preferredSide && (
                            <span>
                                <Award size={14} />
                                {player.preferredSide === 'DRIVE' ? 'Drive' : player.preferredSide === 'REVES' ? 'Revés' : 'Ambos lados'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="profile-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(window.location.href); }}>
                        <Share2 size={14} />
                        Compartir
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card card-stat">
                    <div className="card-stat-icon blue"><Trophy size={20} /></div>
                    <div className="stat-label">PUNTOS TOTALES (12M)</div>
                    <div className="stat-value" style={{ color: 'var(--blue-600)' }}>{player.totalPoints12m?.toLocaleString() || 0}</div>
                </div>
                <div className="card card-stat">
                    <div className="card-stat-icon green"><Calendar size={20} /></div>
                    <div className="stat-label">TORNEOS JUGADOS</div>
                    <div className="stat-value">{tournaments.length}</div>
                </div>
                <div className="card card-stat">
                    <div className="card-stat-icon yellow"><Award size={20} /></div>
                    <div className="stat-label">MEJOR RESULTADO</div>
                    <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                        {bestResult ? positionLabels[bestResult.position]?.label || bestResult.position : '—'}
                    </div>
                    {bestResult && <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{bestResult.tournamentName}</div>}
                </div>
            </div>

            {/* Tournament History */}
            <section className="section fade-in" style={{ paddingTop: 0 }}>
                <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={20} color="var(--blue-600)" />
                        Historial de Torneos
                    </h2>
                </div>

                {tournaments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                        <Trophy size={36} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)', opacity: 0.4 }} />
                        <p style={{ color: 'var(--text-muted)' }}>Sin participaciones registradas.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>TORNEO</th>
                                    <th className="col-hide-mobile">FECHA</th>
                                    <th className="col-hide-mobile">NIVEL</th>
                                    <th>RESULTADO</th>
                                    <th style={{ textAlign: 'right' }}>PUNTOS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tournaments.map((t: any, i: number) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                                <Trophy size={14} color="var(--blue-400)" style={{ flexShrink: 0 }} />
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tournamentName}</span>
                                                    <span className="show-mobile" style={{ display: 'none', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })} · {t.level}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="col-hide-mobile" style={{ color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="col-hide-mobile">{getLevelBadge(t.level)}</td>
                                        <td>
                                            <span className={positionLabels[t.position]?.class || ''} style={{ fontWeight: 500 }}>
                                                {positionLabels[t.position]?.label || t.position}
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
                        <h3 className="section-title" style={{ marginTop: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Award size={18} color="var(--blue-600)" />
                            Historial de Puntos
                        </h3>
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>TORNEO</th><th>CATEGORÍA</th><th>MOTIVO</th><th style={{ textAlign: 'right' }}>PUNTOS</th><th>FECHA</th></tr></thead>
                                <tbody>
                                    {player.pointHistory.map((m: any) => (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 600 }}>{m.tournamentName}</td>
                                            <td><span className="badge-category">{m.category}</span></td>
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
