'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function SearchPage() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const doSearch = async (q: string) => {
        if (!q.trim()) return;
        setLoading(true); setSearched(true);
        try { const data = await api.searchPlayers(q.trim()); setResults(data); }
        catch { setResults([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (query) doSearch(query); }, []);

    return (
        <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
            <div className="breadcrumb">
                <Link href="/">Inicio</Link><span className="separator">/</span><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Buscar Jugadores</span>
            </div>

            <div className="card fade-in" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        Buscar Jugadores
                    </span>
                </h1>
                <form onSubmit={(e) => { e.preventDefault(); doSearch(query); }} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input className="form-input" style={{ flex: 1 }} type="text" placeholder="Nombre, apellido o DNI..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
                </form>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : searched && results.length === 0 ? (
                <div className="empty-state"><p>No se encontraron jugadores para &quot;{query}&quot;.</p></div>
            ) : results.length > 0 && (
                <div className="table-container fade-in">
                    <table className="data-table">
                        <thead><tr><th>JUGADOR</th><th>CATEGORÍA</th><th>LOCALIDAD</th><th style={{ textAlign: 'right' }}>PUNTOS</th><th></th></tr></thead>
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
                                    <td style={{ color: 'var(--text-secondary)' }}>{p.localityName}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.totalPoints12m || 0} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)' }}>pts</span></td>
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
