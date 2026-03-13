'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Trophy, MapPin, Tag, TrendingUp, User, Clock, AlertCircle, BookOpen, FileText, Search, Calendar, Swords } from 'lucide-react';

export default function DashboardPage() {
    const { user, player: playerData, token } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [handedness, setHandedness] = useState('RIGHT');
    const [preferredSide, setPreferredSide] = useState('DRIVE');
    const [gender, setGender] = useState('MALE');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [correctionText, setCorrectionText] = useState('');
    const [msg, setMsg] = useState('');

    // Explore Marketplace
    const [exploreLoading, setExploreLoading] = useState(false);
    const [exploreMatches, setExploreMatches] = useState<any[]>([]);
    const [exploreTournaments, setExploreTournaments] = useState<any[]>([]);
    const [exploreLocality, setExploreLocality] = useState('');
    const [localities, setLocalities] = useState<any[]>([]);

    useEffect(() => {
        api.getLocalities().then(setLocalities).catch(() => { });
    }, []);

    useEffect(() => {
        if (playerData) {
            setFirstName(playerData.firstName || '');
            setLastName(playerData.lastName || '');
            setPhone(playerData.phone || '');
            setHandedness(playerData.handedness || 'RIGHT');
            setPreferredSide(playerData.preferredSide || 'DRIVE');
            setGender(playerData.gender || 'MALE');
            setAvatarUrl(playerData.avatarUrl || '');
        }
        if (token) {
            api.getMyHistory(token)
                .then(setHistory).catch(() => { })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [playerData, token]);

    useEffect(() => {
        if (activeTab === 'explore' && token) {
            setExploreLoading(true);
            api.getExplore(token, exploreLocality || undefined)
                .then(res => {
                    setExploreTournaments(res.tournaments || []);
                    setExploreMatches(res.matches || []);
                })
                .catch(console.error)
                .finally(() => setExploreLoading(false));
        }
    }, [activeTab, exploreLocality, token]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        if (!token) return;
        try { await api.updateProfile(token, { firstName, lastName, phone, handedness, preferredSide, gender, avatarUrl }); setMsg('Perfil actualizado correctamente.'); }
        catch (err: any) { setMsg(err.message || 'Error al actualizar'); }
    };

    const handleCorrection = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        if (!token) return;
        try { await api.submitCorrection(token, correctionText); setCorrectionText(''); setMsg('Solicitud enviada correctamente.'); }
        catch (err: any) { setMsg(err.message || 'Error al enviar'); }
    };

    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

    const tabs = [
        { id: 'profile', label: 'Perfil', icon: User },
        { id: 'explore', label: 'Explorar', icon: Search },
        { id: 'history', label: 'Historial', icon: Clock },
        { id: 'corrections', label: 'Correcciones', icon: AlertCircle },
        { id: 'howto', label: 'Cómo Funciona', icon: BookOpen },
        { id: 'terms', label: 'Términos', icon: FileText },
    ];

    return (
        <div className="container dashboard fade-in">
            {/* Header */}
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div className="avatar avatar-lg avatar-blue">{initials}</div>
                    <div>
                        <h1>{firstName} {lastName}</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{user?.email}</p>
                    </div>
                </div>
            </div>

            {msg && <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 'var(--space-lg)' }}>{msg}</div>}

            {/* Stats */}
            <div className="stats-grid">
                <div className="card card-stat">
                    <div className="card-stat-icon blue"><Trophy size={20} /></div>
                    <div className="stat-label">PUNTOS TOTALES</div>
                    <div className="stat-value">{playerData?.totalPoints || 0}</div>
                </div>
                <div className="card card-stat">
                    <div className="card-stat-icon green"><Tag size={20} /></div>
                    <div className="stat-label">CATEGORÍA</div>
                    <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>{playerData?.categoryName || '—'}</div>
                </div>
                <div className="card card-stat">
                    <div className="card-stat-icon yellow"><MapPin size={20} /></div>
                    <div className="stat-label">LOCALIDAD</div>
                    <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>{playerData?.localityName || '—'}</div>
                </div>
            </div>

            {/* Promotion Progress */}
            {playerData?.promotion && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-2xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-md)' }}>
                        <TrendingUp size={18} color="var(--blue-600)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Progreso de Ascenso</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                        {playerData.promotion.pointsNeeded > 0
                            ? <>Te faltan <strong style={{ color: 'var(--text-primary)' }}>{playerData.promotion.pointsNeeded} puntos</strong> para ascender de <strong>{playerData.promotion.currentCategory}</strong> a <strong>{playerData.promotion.nextCategory}</strong></>
                            : <>¡Felicitaciones! Alcanzaste los puntos para ascender a <strong>{playerData.promotion.nextCategory}</strong>.</>
                        }
                    </p>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', height: '10px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                            background: 'linear-gradient(90deg, var(--blue-500), var(--blue-400))',
                            height: '100%',
                            width: `${Math.min(playerData.promotion.progress, 100)}%`,
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        <span>{playerData.promotion.currentPoints} pts ({playerData.promotion.progress}%)</span>
                        <span>{playerData.promotion.threshold} pts</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Icon size={14} />
                            {label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Explore Tab */}
            {activeTab === 'explore' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Search size={18} color="var(--blue-600)" />
                            Buscar en tu zona
                        </h3>
                        <select className="form-select" style={{ minWidth: '220px', width: 'auto' }} value={exploreLocality} onChange={e => setExploreLocality(e.target.value)}>
                            <option value="">Mi Localidad</option>
                            {localities.map(l => <option key={l.id} value={l.id}>{l.name} - {l.province}</option>)}
                        </select>
                    </div>

                    {exploreLoading ? <div className="loading"><div className="spinner" /></div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                            {/* Torneos */}
                            <div>
                                <h4 style={{ marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                                    <Trophy size={16} color="var(--blue-600)" /> Próximos Torneos
                                </h4>
                                {exploreTournaments.length === 0 ? (
                                    <div className="alert alert-info">No hay torneos próximos en esta localidad.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                                        {exploreTournaments.map((t: any) => (
                                            <div key={t.id} className="card" style={{ padding: 'var(--space-md)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{t.name}</h4>
                                                    <span className="badge-category">{t.category?.name || 'Cat'}</span>
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {t.club?.name}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> {new Date(t.startDate).toLocaleDateString('es-AR')}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={13} /> {t.gender === 'MALE' ? 'Caballeros' : t.gender === 'FEMALE' ? 'Damas' : 'Mixto'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Partidos */}
                            <div>
                                <h4 style={{ marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                                    <Swords size={16} color="var(--success)" /> Partidos Abiertos
                                </h4>
                                {exploreMatches.length === 0 ? (
                                    <div className="alert alert-info">No hay partidos abiertos en esta zona.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                                        {exploreMatches.map((m: any) => (
                                            <div key={m.id} className="card" style={{ padding: 'var(--space-md)', borderTop: '3px solid var(--success-light)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div className="avatar avatar-sm avatar-blue">{m.createdBy?.player?.firstName?.[0] || 'U'}</div>
                                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{m.createdBy?.player?.firstName} {m.createdBy?.player?.lastName}</span>
                                                    </div>
                                                    <span className="badge badge-approved">Abierto</span>
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {m.booking?.court?.club?.name} - Cancha {m.booking?.court?.name}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> {new Date(m.booking?.date).toLocaleDateString('es-AR')} - {m.booking?.startTime}hs</span>
                                                    {m.notes && <span style={{ fontStyle: 'italic', marginTop: '0.15rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>"{m.notes}"</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="card fade-in" style={{ borderRadius: 'var(--radius-2xl)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={18} color="var(--blue-600)" />
                        Datos Personales
                    </h3>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                            <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Foto de Perfil</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }} />
                                ) : (
                                    <div className="avatar avatar-blue" style={{ width: 56, height: 56, fontSize: '1.25rem' }}>{firstName?.[0] || 'U'}</div>
                                )}
                                <input type="file" accept="image/*" onChange={handleFileChange} className="form-input" style={{ flex: 1 }} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11-1234-5678" /></div>
                            <div className="form-group">
                                <label className="form-label">Género</label>
                                <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                                    <option value="MALE">Caballero</option>
                                    <option value="FEMALE">Dama</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Mano Hábil</label><select className="form-select" value={handedness} onChange={(e) => setHandedness(e.target.value)}><option value="RIGHT">Diestro</option><option value="LEFT">Zurdo</option><option value="AMBIDEXTROUS">Ambidiestro</option></select></div>
                            <div className="form-group"><label className="form-label">Lado Preferido</label><select className="form-select" value={preferredSide} onChange={(e) => setPreferredSide(e.target.value)}><option value="DRIVE">Drive</option><option value="REVES">Revés</option><option value="BOTH">Ambos</option></select></div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>Guardar Cambios</button>
                    </form>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="card fade-in" style={{ borderRadius: 'var(--radius-2xl)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={18} color="var(--blue-600)" />
                        Historial de Puntos
                    </h3>
                    {loading ? <div className="loading"><div className="spinner" /></div> : history.length === 0 ? (
                        <div className="empty-state">
                            <Trophy size={36} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)', opacity: 0.4 }} />
                            <p>No tenés historial de puntos todavía.</p>
                        </div>
                    ) : (
                        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                            <table className="data-table">
                                <thead><tr><th>TORNEO</th><th>MOTIVO</th><th style={{ textAlign: 'right' }}>PUNTOS</th><th>FECHA</th></tr></thead>
                                <tbody>
                                    {history.map((h: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{h.tournamentName || h.tournament?.name || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{h.reason}</td>
                                            <td style={{ textAlign: 'right' }}><span className="points-badge">+{h.points}</span></td>
                                            <td style={{ color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleDateString('es-AR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Corrections Tab */}
            {activeTab === 'corrections' && (
                <div className="card fade-in" style={{ borderRadius: 'var(--radius-2xl)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={18} color="var(--blue-600)" />
                        Solicitar Corrección
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        Si notás un error en tus puntos, podés solicitar una corrección. Un administrador revisará tu caso.
                    </p>
                    <form onSubmit={handleCorrection}>
                        <div className="form-group">
                            <label className="form-label">Descripción del Error</label>
                            <textarea className="form-textarea" rows={4} value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} placeholder="Describí el error que encontraste..." required />
                        </div>
                        <button type="submit" className="btn btn-primary">Enviar Solicitud</button>
                    </form>
                </div>
            )}

            {/* How It Works Tab */}
            {activeTab === 'howto' && (
                <div className="card fade-in" style={{ borderRadius: 'var(--radius-2xl)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <BookOpen size={18} color="var(--blue-600)" />
                        ¿Cómo Funciona Rankeate?
                    </h3>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
                        <p><strong style={{ color: 'var(--text-primary)' }}>Rankeate</strong> es el sistema de ranking oficial de padel de Argentina.</p>

                        <h4 style={{ marginTop: 'var(--space-lg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={15} /> Registro
                        </h4>
                        <p>Al registrarte, elegís tu <strong>categoría actual</strong> (1ra a 8va), tu <strong>localidad</strong> y tu <strong>género</strong>. Arrancás con 0 puntos.</p>

                        <h4 style={{ marginTop: 'var(--space-lg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Trophy size={15} /> Torneos
                        </h4>
                        <p>Participás en torneos de clubes habilitados. Al finalizar, el club carga los resultados y el sistema asigna puntos según tu posición.</p>

                        <h4 style={{ marginTop: 'var(--space-lg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <TrendingUp size={15} /> Sistema de Puntos
                        </h4>
                        <div className="table-container" style={{ marginTop: 'var(--space-sm)', border: 'none', boxShadow: 'none' }}>
                            <table className="data-table">
                                <thead><tr><th>Posición</th><th>Torneo 250</th><th>Torneo 500</th><th>Torneo 1000</th></tr></thead>
                                <tbody>
                                    <tr><td style={{ fontWeight: 600 }}>Campeón</td><td>250 pts</td><td>500 pts</td><td>1000 pts</td></tr>
                                    <tr><td style={{ fontWeight: 600 }}>Finalista</td><td>150 pts</td><td>300 pts</td><td>600 pts</td></tr>
                                    <tr><td style={{ fontWeight: 600 }}>Semifinalista</td><td>75 pts</td><td>150 pts</td><td>300 pts</td></tr>
                                    <tr><td style={{ fontWeight: 600 }}>Cuartos</td><td>40 pts</td><td>80 pts</td><td>160 pts</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 style={{ marginTop: 'var(--space-lg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Tag size={15} /> Ranking
                        </h4>
                        <p>Se calcula sumando los <strong>mejores 8 resultados</strong> de los últimos <strong>12 meses</strong>. Separado por género y filtrable por categoría y localidad.</p>

                        <h4 style={{ marginTop: 'var(--space-lg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <TrendingUp size={15} /> Ascenso
                        </h4>
                        <p>Si acumulás suficientes puntos, ascendés automáticamente. Los umbrales:</p>
                        <div className="table-container" style={{ marginTop: 'var(--space-sm)', border: 'none', boxShadow: 'none' }}>
                            <table className="data-table">
                                <thead><tr><th>Ascenso</th><th>Puntos necesarios</th></tr></thead>
                                <tbody>
                                    <tr><td>8va → 7ma</td><td>300 pts</td></tr>
                                    <tr><td>7ma → 6ta</td><td>600 pts</td></tr>
                                    <tr><td>6ta → 5ta</td><td>1.200 pts</td></tr>
                                    <tr><td>5ta → 4ta</td><td>2.000 pts</td></tr>
                                    <tr><td>4ta → 3ra</td><td>3.500 pts</td></tr>
                                    <tr><td>3ra → 2da</td><td>5.500 pts</td></tr>
                                    <tr><td>2da → 1ra</td><td>8.000 pts</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms Tab */}
            {activeTab === 'terms' && (
                <div className="card fade-in" style={{ borderRadius: 'var(--radius-2xl)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={18} color="var(--blue-600)" />
                        Términos y Condiciones
                    </h3>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
                        <h4 style={{ color: 'var(--text-primary)' }}>1. Aceptación de los Términos</h4>
                        <p>Al registrarte y utilizar Rankeate, aceptás los siguientes términos y condiciones.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>2. Registro y Datos Personales</h4>
                        <p>El jugador debe proporcionar datos verídicos, incluyendo nombre completo, DNI y categoría. Información falsa puede resultar en la eliminación de la cuenta.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>3. Sistema de Puntos</h4>
                        <p>Los puntos son otorgados por clubes aprobados. No se pueden transferir, comprar ni intercambiar.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>4. Rankings</h4>
                        <p>Se calculan automáticamente en base a los mejores 8 resultados de 12 meses. La administración puede anular puntos ante irregularidades.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>5. Categorías</h4>
                        <p>Auto-declarada al registro (1ra a 8va). La administración podrá reclasificar jugadores si los resultados lo indican.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>6. Conducta</h4>
                        <p>Se espera conducta deportiva. La administración puede suspender cuentas por conducta antideportiva.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>7. Privacidad</h4>
                        <p>Nombre, DNI y localidad son visibles en rankings. Email y teléfono son privados.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>8. Modificaciones</h4>
                        <p>Rankeate puede modificar estos términos en cualquier momento, comunicando los cambios a través de la plataforma.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
