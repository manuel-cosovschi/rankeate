'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface RankingEntry {
    rank: number;
    playerId: number;
    firstName: string;
    lastName: string;
    totalPoints: number;
    localityName: string;
    categoryName: string;
}

export default function HomePage() {
    const [rankings, setRankings] = useState<RankingEntry[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [localities, setLocalities] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedLocality, setSelectedLocality] = useState('');
    const [selectedGender, setSelectedGender] = useState('MALE');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    useEffect(() => {
        Promise.all([api.getCategories(), api.getLocalities()])
            .then(([cats, locs]) => { setCategories(cats); setLocalities(locs); })
            .catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);
        const params: Record<string, string> = { page: String(page), limit: String(limit), gender: selectedGender };
        if (selectedCategory) params.categoryId = selectedCategory;
        if (selectedLocality) params.localityId = selectedLocality;

        api.getRankings(params)
            .then((data) => { setRankings(data.data); setTotal(data.total); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedCategory, selectedLocality, selectedGender, page]);

    const totalPages = Math.ceil(total / limit);

    const getRankBubble = (rank: number) => {
        if (rank <= 3) {
            const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : 'rank-3';
            return <span className={`rank-bubble ${cls}`}>{rank}</span>;
        }
        return <span className="rank-bubble rank-default">{rank}</span>;
    };

    const getInitials = (first: string, last: string) =>
        `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

    const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-yellow'];

    const handleHeroSearch = () => {
        if (searchQuery.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
        }
    };

    return (
        <>
            {/* Hero Section */}
            <section className="hero-blue">
                <div className="hero-content">
                    <div className="hero-badge"><span className="dot"></span> Ranking en Vivo 2025</div>
                    <h1 className="hero-title">El Ranking Oficial de<br />Padel de Argentina</h1>
                    <p className="hero-subtitle">
                        Competí, ganá y seguí tu progreso. Encontrá tu ranking hoy entre miles de jugadores y clubes de todo el país.
                    </p>
                    <div className="hero-search">
                        <div className="search-field">
                            <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                            <input
                                type="text"
                                placeholder="Buscar jugador..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
                            />
                        </div>
                        <div className="search-field">
                            <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            <select value={selectedLocality} onChange={(e) => { setSelectedLocality(e.target.value); setPage(1); }}>
                                <option value="">Todas las Localidades</option>
                                {localities.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                        </div>
                        <div className="search-field">
                            <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16M4 20V4l8 4 8-4v16" /></svg>
                            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}>
                                <option value="">Todas las Categorías</option>
                                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={handleHeroSearch}>Buscar</button>
                    </div>
                </div>
            </section>

            {/* Rankings Section */}
            <div className="container">
                <section className="section">
                    <div className="home-layout">
                        {/* Sidebar */}
                        <aside className="category-sidebar">
                            <div className="card" style={{ padding: 'var(--space-md)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h6" /></svg>
                                    Categorías
                                </h3>
                                <div className="category-list">
                                    <div
                                        className={`category-item ${!selectedCategory ? 'active' : ''}`}
                                        onClick={() => { setSelectedCategory(''); setPage(1); }}
                                    >
                                        <span>Todas las Categorías</span>
                                        <span className="count">{total || '—'}</span>
                                    </div>
                                    {categories.map((cat) => (
                                        <div
                                            key={cat.id}
                                            className={`category-item ${selectedCategory === String(cat.id) ? 'active' : ''}`}
                                            onClick={() => { setSelectedCategory(String(cat.id)); setPage(1); }}
                                        >
                                            <span>{cat.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="cta-card">
                                <h3>¿Sos jugador?</h3>
                                <p>Unite al ranking oficial, seguí tus estadísticas y competí en torneos.</p>
                                <Link href="/register" className="btn btn-sm">Crear Perfil de Jugador</Link>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div>
                            <div className="section-header">
                                <h2 className="section-title" style={{ marginBottom: 0 }}>Ranking {selectedGender === 'MALE' ? 'Caballeros' : 'Damas'}</h2>
                            </div>
                            <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
                                <button className={`tab ${selectedGender === 'MALE' ? 'active' : ''}`} onClick={() => { setSelectedGender('MALE'); setPage(1); }}>🏆 Caballeros</button>
                                <button className={`tab ${selectedGender === 'FEMALE' ? 'active' : ''}`} onClick={() => { setSelectedGender('FEMALE'); setPage(1); }}>🏆 Damas</button>
                            </div>

                            {loading ? (
                                <div className="loading"><div className="spinner" /></div>
                            ) : rankings.length === 0 ? (
                                <div className="empty-state"><p>No hay jugadores en este ranking aún.</p></div>
                            ) : (
                                <>
                                    <div className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '60px' }}>RANK</th>
                                                    <th>JUGADOR</th>
                                                    <th>CATEGORÍA</th>
                                                    <th>CLUB / LOCALIDAD</th>
                                                    <th style={{ textAlign: 'right' }}>PUNTOS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rankings.map((entry) => (
                                                    <tr key={entry.playerId} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/players/${entry.playerId}`}>
                                                        <td>{getRankBubble(entry.rank)}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div className={`avatar avatar-sm ${avatarColors[entry.rank % 3]}`}>
                                                                    {getInitials(entry.firstName, entry.lastName)}
                                                                </div>
                                                                <Link href={`/players/${entry.playerId}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                                    {entry.firstName} {entry.lastName}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                        <td><span className="badge-category">{entry.categoryName}</span></td>
                                                        <td>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                                                {entry.localityName}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <span className="points-value">{entry.totalPoints.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)' }}>pts</span></span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pagination">
                                        <span>Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de {total}</span>
                                        <div className="pagination-controls">
                                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
                                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA Banner */}
                <div className="cta-banner">
                    <div>
                        <h2>¿Tenés un Club de Padel?</h2>
                        <p>Registrá tu club para organizar torneos oficiales, administrar canchas y aparecer en el directorio nacional.</p>
                    </div>
                    <Link href="/register" className="btn btn-lg">Registrar mi Club</Link>
                </div>
            </div>
        </>
    );
}
