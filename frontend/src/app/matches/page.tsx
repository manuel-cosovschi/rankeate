"use client";

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function MatchesPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            const { data } = await api.get('/matches/open');
            setMatches(data);
        } catch (error) {
            console.error('Error fetching matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (matchId: number) => {
        if (!user) {
            router.push('/login?redirect=/matches');
            return;
        }
        router.push(`/matches/${matchId}/accept`);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: 'var(--space-xl) var(--space-md)' }}>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                    Partidos Abiertos
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-lg)' }}>
                    Sumate a un partido buscando jugadores en tu zona.
                </p>
            </div>

            {matches.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-3xl) var(--space-xl)', background: 'var(--bg-card)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
                    <div className="avatar avatar-blue" style={{ width: 80, height: 80, fontSize: '2rem', marginBottom: 'var(--space-lg)', margin: '0 auto', background: 'var(--blue-50)', color: 'var(--blue-600)' }}>
                        <Calendar size={40} />
                    </div>
                    <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>No hay partidos abiertos</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto var(--space-xl)', lineHeight: 1.6 }}>
                        Parece que ahora mismo no hay partidos buscando jugadores. Podés crear uno armando tu propio grupo desde tus reservas.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => router.push('/search')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <MapPin size={18} /> Buscar Cancha
                        </button>
                        <button className="btn btn-outline" onClick={() => router.push('/dashboard')}>
                            Ir al Panel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid-2" style={{ gap: 'var(--space-lg)', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {matches.map((match) => (
                        <div key={match.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                    <span className="badge" style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}>
                                        Buscando jugadores
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                                        <Users size={14} color="var(--blue-600)" />
                                        {match.participants?.length || 0} / {match.maxPlayers}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                                    {match.booking?.court?.club?.name || 'Club'}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                    <MapPin size={16} />
                                    Cancha {match.booking?.court?.name || '-'}
                                </div>
                            </div>

                            <div style={{ padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
                                        <Calendar size={18} color="var(--text-muted)" />
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {format(new Date(match.booking?.startAt || new Date()), "EEEE d 'de' MMMM", { locale: es })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
                                        <Clock size={18} color="var(--text-muted)" />
                                        <span>
                                            {format(new Date(match.booking?.startAt || new Date()), "HH:mm")} - {format(new Date(match.booking?.endAt || new Date()), "HH:mm")}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
                                        <Trophy size={18} color="var(--text-muted)" />
                                        <span>Organiza: {match.createdBy?.player?.firstName || ''} {match.createdBy?.player?.lastName || ''}</span>
                                    </div>

                                    {match.notes && (
                                        <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--blue-500)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                            "{match.notes}"
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>A pagar c/u</div>
                                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--blue-600)' }}>
                                            ${Math.ceil((match.booking?.totalPrice || 0) / (match.maxPlayers || 4)).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" onClick={() => handleJoin(match.id)}>
                                        Unirme
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
