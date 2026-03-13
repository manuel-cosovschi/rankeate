'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Search, MapPin, Users } from 'lucide-react';

function SearchContent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const doSearch = async (q: string) => {
        if (!q.trim()) return;
        setLoading(true); setSearched(true);
        try { const data = await api.searchPlayers({ q: q.trim() }); setResults(data); }
        catch { setResults([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (query) doSearch(query); }, []);

    return (
        <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
            <div className="breadcrumb">
                <Link href="/">Inicio</Link>
                <span className="separator">/</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Buscar Jugadores</span>
            </div>

            <div className="card fade-in" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', borderRadius: 'var(--radius-2xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-md)', letterSpacing: '-0.02em' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={22} color="var(--blue-600)" />
                        Buscar Jugadores
                    </span>
                </h1>
                <form onSubmit={(e) => { e.preventDefault(); doSearch(query); }} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input className="form-input" style={{ paddingLeft: '2.5rem' }} type="text" placeholder="Nombre, apellido o DNI..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
                </form>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : searched && results.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                    <Users size={40} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>No se encontraron jugadores para &quot;{query}&quot;</p>
                </div>
            ) : results.length > 0 && (
                <div className="table-container fade-in">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>JUGADOR</th>
                                <th>CATEGORÍA</th>
                                <th>LOCALIDAD</th>
                                <th style={{ textAlign: 'right' }}>PUNTOS</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div className="avatar avatar-sm avatar-blue">{p.firstName?.[0]}{p.lastName?.[0]}</div>
                                            <span style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</span>
                                        </div>
                                    </td>
                                    <td><span className="badge-category">{p.categoryName}</span></td>
                                    <td>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                            <MapPin size={13} />
                                            {p.localityName}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className="points-value">{p.totalPoints12m || 0} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)' }}>pts</span></span>
                                    </td>
                                    <td><Link href={`/players/${p.id}`} className="btn btn-outline btn-sm">Ver Perfil</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
            <SearchContent />
        </Suspense>
    );
}
