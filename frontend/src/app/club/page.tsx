'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const wizardSteps = ['Categoría', 'Agregar Jugadores', 'Posiciones', 'Vista Previa'];

export default function ClubPage() {
    const { user, club: clubData, token } = useAuth();
    const [activeTab, setActiveTab] = useState('tournaments');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    // Config
    const [mpToken, setMpToken] = useState('');

    // Create tournament
    const [tName, setTName] = useState('');
    const [tDate, setTDate] = useState('');
    const [tLevel, setTLevel] = useState('250');
    const [tLocalityId, setTLocalityId] = useState('');
    const [localities, setLocalities] = useState<any[]>([]);

    // Result wizard
    const [wizardTournament, setWizardTournament] = useState<any>(null);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardCategory, setWizardCategory] = useState('');
    const [wizardPlayers, setWizardPlayers] = useState<any[]>([]);
    const [playerSearch, setPlayerSearch] = useState('');
    const [playerResults, setPlayerResults] = useState<any[]>([]);
    const [wizardPositions, setWizardPositions] = useState<Record<number, string>>({});

    useEffect(() => {
        if (!token) return;
        Promise.all([
            api.getMyTournaments(token).catch(() => []),
            api.getCategories(),
            api.getLocalities(),
            api.getClubDashboard(token)
        ]).then(([t, cats, locs, cl]) => {
            setTournaments(t || []); setCategories(cats); setLocalities(locs);
            if (cl?.mpAccessToken) setMpToken(cl.mpAccessToken);
        }).catch(console.error).finally(() => setLoading(false));
    }, [token]);

    const handleUpdateMpToken = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.updateMpToken(token!, mpToken);
            setMsg('✅ Token de Mercado Pago guardado');
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        if (!token) return;
        try {
            const t = await api.createTournament(token, { name: tName, date: tDate, level: tLevel, localityId: parseInt(tLocalityId) });
            setTournaments([t, ...tournaments]); setTName(''); setTDate(''); setMsg('Torneo creado correctamente.');
        } catch (err: any) { setMsg(err.message); }
    };

    const searchPlayers = async () => {
        if (!playerSearch.trim() || !token) return;
        try { const data = await api.searchPlayersClub(token, { q: playerSearch.trim() }); setPlayerResults(data); }
        catch { setPlayerResults([]); }
    };

    const addPlayer = (p: any) => {
        if (!wizardPlayers.find((wp) => wp.id === p.id)) {
            setWizardPlayers([...wizardPlayers, p]);
        }
        setPlayerSearch(''); setPlayerResults([]);
    };

    const removePlayer = (id: number) => setWizardPlayers(wizardPlayers.filter((p) => p.id !== id));

    const positions = ['CHAMPION', 'FINALIST', 'SEMIFINALIST', 'QUARTERFINALIST', 'ROUND_OF_16', 'PARTICIPANT'];
    const posLabels: Record<string, string> = { CHAMPION: 'Campeón', FINALIST: 'Finalista', SEMIFINALIST: 'Semifinalista', QUARTERFINALIST: 'Cuartos', ROUND_OF_16: 'Octavos', PARTICIPANT: 'Participante' };

    const handleSubmitResults = async () => {
        setMsg('');
        if (!token) return;
        try {
            const results = wizardPlayers.map((p) => ({ playerId: p.id, position: wizardPositions[p.id] || 'PARTICIPANT', categoryId: parseInt(wizardCategory) }));
            await api.submitResults(token, wizardTournament.id, { results });
            setMsg('Resultados cargados correctamente.'); setWizardTournament(null); setWizardStep(0);
            setWizardPlayers([]); setWizardPositions({});
        } catch (err: any) { setMsg(err.message); }
    };

    const statusBadge = (s: string) => {
        const cls = s === 'APPROVED' ? 'badge-approved' : s === 'PENDING' ? 'badge-pending' : 'badge-rejected';
        const label = s === 'APPROVED' ? 'Aprobado' : s === 'PENDING' ? 'Pendiente' : 'Rechazado';
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div className="container dashboard fade-in">
            <div className="dashboard-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        {clubData?.name || 'Mi Club'}
                        {statusBadge(clubData?.status || 'PENDING')}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{user?.email}</p>
                </div>
            </div>

            {msg && <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

            {clubData?.status !== 'APPROVED' && (
                <div className="alert alert-warning">Tu club está pendiente de aprobación por un administrador. No podrás crear torneos hasta que sea aprobado.</div>
            )}

            {/* Result Wizard */}
            {wizardTournament && (
                <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="breadcrumb" style={{ marginBottom: 'var(--space-md)' }}>
                        <span style={{ cursor: 'pointer', color: 'var(--blue-600)' }} onClick={() => { setWizardTournament(null); setWizardStep(0); }}>Club Panel</span>
                        <span className="separator">/</span>
                        <span>{wizardTournament.name}</span>
                        <span className="separator">/</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Cargar Resultados</span>
                    </div>

                    <div className="stepper">
                        {wizardSteps.map((label, i) => (
                            <span key={label} style={{ display: 'contents' }}>
                                <div className={`stepper-step ${i < wizardStep ? 'completed' : ''} ${i === wizardStep ? 'active' : ''}`}>
                                    <div className="stepper-circle">{i < wizardStep ? '✓' : i + 1}</div>
                                    <div className="stepper-label">{label}</div>
                                </div>
                                {i < wizardSteps.length - 1 && <div className={`stepper-line ${i < wizardStep ? 'completed' : ''}`} />}
                            </span>
                        ))}
                    </div>

                    {wizardStep === 0 && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Seleccioná la Categoría</h3>
                            <div className="form-group">
                                <select className="form-select" value={wizardCategory} onChange={(e) => setWizardCategory(e.target.value)}>
                                    <option value="">Seleccionar categoría</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <button className="btn btn-primary" disabled={!wizardCategory} onClick={() => setWizardStep(1)}>Siguiente: Agregar Jugadores →</button>
                        </div>
                    )}

                    {wizardStep === 1 && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Agregar Jugadores</h3>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                <input className="form-input" placeholder="Buscar por nombre..." value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPlayers()} />
                                <button className="btn btn-secondary" onClick={searchPlayers}>Buscar</button>
                            </div>
                            {playerResults.length > 0 && (
                                <div className="table-container" style={{ marginBottom: 'var(--space-md)' }}>
                                    <table className="data-table"><tbody>
                                        {playerResults.map((p: any) => (
                                            <tr key={p.id}>
                                                <td><span style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</span></td>
                                                <td><span className="badge-category">{p.categoryName}</span></td>
                                                <td><button className="btn btn-primary btn-sm" onClick={() => addPlayer(p)}>+ Agregar</button></td>
                                            </tr>
                                        ))}
                                    </tbody></table>
                                </div>
                            )}
                            <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Jugadores Agregados ({wizardPlayers.length})</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                                {wizardPlayers.map((p) => (
                                    <div key={p.id} className="player-chip">
                                        <div className="avatar avatar-sm avatar-blue" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>{p.firstName?.[0]}{p.lastName?.[0]}</div>
                                        <span>{p.firstName} {p.lastName}</span>
                                        <span className="chip-remove" onClick={() => removePlayer(p.id)}>✕</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-ghost" onClick={() => setWizardStep(0)}>← Volver</button>
                                <button className="btn btn-primary" disabled={wizardPlayers.length === 0} onClick={() => setWizardStep(2)}>Siguiente: Posiciones →</button>
                            </div>
                        </div>
                    )}

                    {wizardStep === 2 && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Asignar Posiciones</h3>
                            <div className="table-container" style={{ marginBottom: 'var(--space-lg)' }}>
                                <table className="data-table">
                                    <thead><tr><th>JUGADOR</th><th>POSICIÓN</th></tr></thead>
                                    <tbody>
                                        {wizardPlayers.map((p) => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</td>
                                                <td><select className="form-select" style={{ maxWidth: 200 }} value={wizardPositions[p.id] || 'PARTICIPANT'} onChange={(e) => setWizardPositions({ ...wizardPositions, [p.id]: e.target.value })}>
                                                    {positions.map((pos) => <option key={pos} value={pos}>{posLabels[pos]}</option>)}
                                                </select></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-ghost" onClick={() => setWizardStep(1)}>← Volver</button>
                                <button className="btn btn-primary" onClick={() => setWizardStep(3)}>Siguiente: Vista Previa →</button>
                            </div>
                        </div>
                    )}

                    {wizardStep === 3 && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Vista Previa de Resultados</h3>
                            <div className="alert alert-info">Revisá los resultados antes de confirmar. Una vez confirmados, se otorgarán los puntos automáticamente.</div>
                            <div className="table-container" style={{ marginBottom: 'var(--space-lg)' }}>
                                <table className="data-table">
                                    <thead><tr><th>JUGADOR</th><th>POSICIÓN</th></tr></thead>
                                    <tbody>
                                        {wizardPlayers.map((p) => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</td>
                                                <td><span className={wizardPositions[p.id] === 'CHAMPION' ? 'position-champion' : ''}>{posLabels[wizardPositions[p.id]] || 'Participante'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-ghost" onClick={() => setWizardStep(2)}>← Volver</button>
                                <button className="btn btn-success btn-lg" onClick={() => { if (confirm('¿Confirmar resultados? Los puntos se asignarán automáticamente.')) handleSubmitResults(); }}>
                                    ✓ Confirmar Resultados
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!wizardTournament && (
                <>
                    <div className="tabs">
                        <button className={`tab ${activeTab === 'tournaments' ? 'active' : ''}`} onClick={() => setActiveTab('tournaments')}>Mis Torneos</button>
                        <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>Crear Torneo</button>
                        <button className="tab" onClick={() => window.location.href = '/club/courts'}>🏟️ Canchas</button>
                        <button className={`tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>⚙️ Configuración</button>
                        <button className={`tab ${activeTab === 'howto' ? 'active' : ''}`} onClick={() => setActiveTab('howto')}>Cómo Funciona</button>
                        <button className={`tab ${activeTab === 'terms' ? 'active' : ''}`} onClick={() => setActiveTab('terms')}>Términos</button>
                    </div>

                    {activeTab === 'config' && (
                        <div className="card fade-in" style={{ maxWidth: '500px' }}>
                            <h3 className="card-title">Configuración de Pagos</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                                Ingresá tu Access Token de producción de Mercado Pago para que los jugadores te paguen directamente a tu cuenta al reservar canchas.
                            </p>
                            <form onSubmit={handleUpdateMpToken} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                <div className="form-group">
                                    <label className="form-label">Access Token (Prod)</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="APP_USR-..."
                                        value={mpToken}
                                        onChange={e => setMpToken(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Guardar Token</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'tournaments' && (
                        <div className="fade-in">
                            {tournaments.length === 0 ? (
                                <div className="empty-state"><p>No tenés torneos creados.</p></div>
                            ) : (
                                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                                    {tournaments.map((t: any) => (
                                        <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                                            <div>
                                                <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-xs)' }}>{t.name}</h3>
                                                <div style={{ display: 'flex', gap: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                    <span>📅 {new Date(t.date || t.startDate).toLocaleDateString('es-AR')}</span>
                                                    <span className={`badge-level badge-level-${t.level}`}>{t.level}</span>
                                                    <span>{statusBadge(t.status || 'DRAFT')}</span>
                                                </div>
                                            </div>
                                            <button className="btn btn-primary btn-sm" onClick={() => { setWizardTournament(t); setWizardStep(0); }}>Cargar Resultados</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="card fade-in">
                            <h3 className="card-title">Nuevo Torneo</h3>
                            <form onSubmit={handleCreateTournament}>
                                <div className="form-group"><label className="form-label">Nombre del Torneo</label><input className="form-input" value={tName} onChange={(e) => setTName(e.target.value)} required /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} required /></div>
                                    <div className="form-group"><label className="form-label">Nivel</label><select className="form-select" value={tLevel} onChange={(e) => setTLevel(e.target.value)}><option value="250">250</option><option value="500">500</option><option value="1000">1000</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Localidad</label><select className="form-select" value={tLocalityId} onChange={(e) => setTLocalityId(e.target.value)} required><option value="">Seleccionar</option>{localities.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                                <button type="submit" className="btn btn-primary">Crear Torneo</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'howto' && (
                        <div className="card fade-in">
                            <h3 className="card-title">🏆 ¿Cómo Funciona Rankeate para Clubes?</h3>
                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
                                <p><strong>Rankeate</strong> permite a los clubes organizar torneos oficiales y otorgar puntos que cuentan para el ranking nacional.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📋 Paso 1: Registro y Aprobación</h4>
                                <p>Al registrar tu club, queda en estado <strong>Pendiente</strong>. Un administrador revisará y aprobará tu solicitud. Una vez aprobado, podés crear torneos.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>🎾 Paso 2: Crear un Torneo</h4>
                                <p>Desde la pestaña "Crear Torneo", completá el nombre, fecha, localidad y <strong>nivel</strong> del torneo:</p>
                                <ul style={{ paddingLeft: 'var(--space-lg)', margin: 'var(--space-sm) 0' }}>
                                    <li><strong>Nivel 250:</strong> Torneo local / social</li>
                                    <li><strong>Nivel 500:</strong> Torneo regional / intermedio</li>
                                    <li><strong>Nivel 1000:</strong> Torneo mayor / campeonato</li>
                                </ul>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📊 Paso 3: Cargar Resultados</h4>
                                <p>Una vez finalizado el torneo, usá el botón "Cargar Resultados" en la tarjeta del torneo. El wizard de 4 pasos te guía:</p>
                                <ol style={{ paddingLeft: 'var(--space-lg)', margin: 'var(--space-sm) 0' }}>
                                    <li>Elegí la <strong>categoría</strong> del cuadro (1ra a 8va)</li>
                                    <li>Buscá y agregá los <strong>jugadores</strong> que participaron</li>
                                    <li>Asigná la <strong>posición</strong> final de cada jugador</li>
                                    <li>Revisá y confirmá los resultados</li>
                                </ol>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>✅ Asignación Automática de Puntos</h4>
                                <table className="data-table" style={{ marginTop: 'var(--space-sm)' }}>
                                    <thead><tr><th>Posición</th><th>Torneo 250</th><th>Torneo 500</th><th>Torneo 1000</th></tr></thead>
                                    <tbody>
                                        <tr><td>🥇 Campeón</td><td>250 pts</td><td>500 pts</td><td>1000 pts</td></tr>
                                        <tr><td>🥈 Finalista</td><td>150 pts</td><td>300 pts</td><td>600 pts</td></tr>
                                        <tr><td>🥉 Semifinalista</td><td>75 pts</td><td>150 pts</td><td>300 pts</td></tr>
                                        <tr><td>Cuartos de Final</td><td>40 pts</td><td>80 pts</td><td>160 pts</td></tr>
                                    </tbody>
                                </table>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📝 Importante</h4>
                                <p>Los resultados son <strong>permanentes</strong> una vez cargados. Si hay un error, un administrador puede anular puntos. El club es responsable de la veracidad de los resultados.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'terms' && (
                        <div className="card fade-in">
                            <h3 className="card-title">📜 Términos y Condiciones para Clubes</h3>
                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
                                <h4 style={{ color: 'var(--text-primary)' }}>1. Responsabilidad del Club</h4>
                                <p>El club es responsable de la veracidad de todos los resultados cargados en la plataforma. Cargar resultados falsos o manipulados resultará en la suspensión y posible eliminación del club.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>2. Aprobación</h4>
                                <p>Todo club debe ser aprobado por la administración antes de poder crear torneos. La administración se reserva el derecho de rechazar o revocar la aprobación en cualquier momento.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>3. Torneos</h4>
                                <p>Los torneos deben ser eventos reales realizados en las instalaciones del club o locaciones autorizadas. No se permite la creación de torneos ficticios.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>4. Puntos</h4>
                                <p>El club otorga puntos siguiendo estrictamente la tabla de puntos oficial según el nivel del torneo y la posición del jugador. No se pueden otorgar puntos discrecionalmente.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>5. Datos del Responsable</h4>
                                <p>El responsable del club debe proporcionar datos verídicos (nombre y DNI). Esta información puede ser verificada por la administración.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>6. Auditoría</h4>
                                <p>Todas las acciones del club (creación de torneos, carga de resultados) quedan registradas en el sistema de auditoría. La administración puede revisar cualquier actividad en cualquier momento.</p>
                                <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>7. Uso de Datos</h4>
                                <p>Los datos del club (nombre, localidad) son públicos. La información del responsable es privada y solo accesible por administradores.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
