'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Trophy, MapPin, Tag, Search, TrendingUp, Users, Award } from 'lucide-react';

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
                    <div className="hero-badge">
                        <span className="dot"></span>
                        Ranking en Vivo 2025
                    </div>
                    <h1 className="hero-title">
                        El Ranking Oficial de<br />Padel en Argentina
                    </h1>
                    <p className="hero-subtitle">
                        Competí, ganá y seguí tu progreso entre miles de jugadores y clubes de todo el país.
                    </p>
                    <div className="hero-search">
                        <div className="search-field">
                            <Search className="field-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar jugador por nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
                            />
                        </div>
                        <div className="search-field">
                            <MapPin className="field-icon" size={16} />
                            <select value={selectedLocality} onChange={(e) => { setSelectedLocality(e.target.value); setPage(1); }}>
                                <option value="">Todas las Localidades</option>
                                {localities.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                        </div>
                        <div className="search-field">
                            <Tag className="field-icon" size={16} />
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
                                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                                    <Tag size={14} />
                                    <span className="hide-mobile" style={{ display: 'inline' }}>Categorías</span>
                                    <span className="show-mobile" style={{ display: 'none' }}>Filtrar</span>
                                </h3>
                                <div className="category-list">
                                    <div
                                        className={`category-item ${!selectedCategory ? 'active' : ''}`}
                                        onClick={() => { setSelectedCategory(''); setPage(1); }}
                                    >
                                        <span>Todas</span>
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

                            <div className="cta-card hide-mobile" style={{ display: 'none' }}>
                                <h3>¿Sos jugador?</h3>
                                <p>Unite al ranking oficial y seguí tu progreso en cada torneo.</p>
                                <Link href="/register" className="btn btn-sm">Crear Perfil</Link>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div>
                            <div className="section-header">
                                <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Trophy size={20} color="var(--blue-600)" />
                                    Ranking {selectedGender === 'MALE' ? 'Caballeros' : 'Damas'}
                                </h2>
                                {total > 0 && (
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {total} jugadores
                                    </span>
                                )}
                            </div>
                            <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
                                <button className={`tab ${selectedGender === 'MALE' ? 'active' : ''}`} onClick={() => { setSelectedGender('MALE'); setPage(1); }}>
                                    Caballeros
                                </button>
                                <button className={`tab ${selectedGender === 'FEMALE' ? 'active' : ''}`} onClick={() => { setSelectedGender('FEMALE'); setPage(1); }}>
                                    Damas
                                </button>
                            </div>

                            {loading ? (
                                <div className="loading"><div className="spinner" /></div>
                            ) : rankings.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                    <Users size={40} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-md)' }}>No hay jugadores en este ranking aún.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="table-container fade-in">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '52px' }}>#</th>
                                                    <th>JUGADOR</th>
                                                    <th className="col-hide-mobile">CATEGORÍA</th>
                                                    <th className="col-hide-mobile">LOCALIDAD</th>
                                                    <th style={{ textAlign: 'right' }}>PUNTOS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rankings.map((entry, idx) => (
                                                    <tr key={entry.playerId} className={`fade-in stagger-${Math.min(idx + 1, 4)}`} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/players/${entry.playerId}`}>
                                                        <td>{getRankBubble(entry.rank)}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                                                <div className={`avatar avatar-sm ${avatarColors[entry.rank % 3]}`} style={{ flexShrink: 0 }}>
                                                                    {getInitials(entry.firstName, entry.lastName)}
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <Link href={`/players/${entry.playerId}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {entry.firstName} {entry.lastName}
                                                                    </Link>
                                                                    {/* Category shown inline on mobile only */}
                                                                    <span className="show-mobile" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                        {entry.categoryName} · {entry.localityName}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="col-hide-mobile"><span className="badge-category">{entry.categoryName}</span></td>
                                                        <td className="col-hide-mobile">
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                                <MapPin size={13} />
                                                                {entry.localityName}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <span className="points-value">
                                                                {entry.totalPoints.toLocaleString()}
                                                                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--font-size-xs)', marginLeft: '3px' }}>pts</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pagination">
                                        <span>Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</span>
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

                {/* Features Section */}
                <div className="features-grid fade-in">
                    <div className="feature-card">
                        <div className="feature-icon blue">
                            <TrendingUp size={26} />
                        </div>
                        <h3>Ranking en Vivo</h3>
                        <p>Seguí tu posición actualizada en tiempo real con cada torneo que jugás.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon green">
                            <Award size={26} />
                        </div>
                        <h3>Torneos Oficiales</h3>
                        <p>Participá en torneos de clubes verificados y sumá puntos para tu ranking.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon gold">
                            <Users size={26} />
                        </div>
                        <h3>Comunidad</h3>
                        <p>Conectá con jugadores de tu zona, encontrá partidos y reservá canchas.</p>
                    </div>
                </div>

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
