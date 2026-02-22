'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

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
    const [correctionText, setCorrectionText] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (playerData) {
            setFirstName(playerData.firstName || '');
            setLastName(playerData.lastName || '');
            setPhone(playerData.phone || '');
            setHandedness(playerData.handedness || 'RIGHT');
            setPreferredSide(playerData.preferredSide || 'DRIVE');
        }
        if (token) {
            api.getMyHistory(token)
                .then(setHistory).catch(() => { })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [playerData, token]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        if (!token) return;
        try { await api.updateProfile(token, { firstName, lastName, phone, handedness, preferredSide }); setMsg('Perfil actualizado correctamente.'); }
        catch (err: any) { setMsg(err.message || 'Error al actualizar'); }
    };

    const handleCorrection = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        if (!token) return;
        try { await api.submitCorrection(token, correctionText); setCorrectionText(''); setMsg('Solicitud enviada correctamente.'); }
        catch (err: any) { setMsg(err.message || 'Error al enviar'); }
    };

    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

    return (
        <div className="container dashboard fade-in">
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div className="avatar avatar-lg avatar-blue">{initials}</div>
                    <div>
                        <h1>{firstName} {lastName}</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{user?.email}</p>
                    </div>
                </div>
            </div>

            {msg && <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

            <div className="stats-grid">
                <div className="card card-stat">
                    <div className="stat-label">PUNTOS TOTALES</div>
                    <div className="stat-value">{playerData?.totalPoints || 0}</div>
                </div>
                <div className="card card-stat">
                    <div className="stat-label">CATEGORÍA</div>
                    <div className="stat-value">{playerData?.categoryName || '—'}</div>
                </div>
                <div className="card card-stat">
                    <div className="stat-label">LOCALIDAD</div>
                    <div className="stat-value">{playerData?.localityName || '—'}</div>
                </div>
            </div>

            {/* Promotion Progress */}
            {playerData?.promotion && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 className="card-title">🚀 Progreso de Ascenso</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                        {playerData.promotion.pointsNeeded > 0
                            ? <>Te faltan <strong>{playerData.promotion.pointsNeeded} puntos</strong> para ascender de <strong>{playerData.promotion.currentCategory}</strong> a <strong>{playerData.promotion.nextCategory}</strong></>
                            : <>¡Felicitaciones! Alcanzaste los puntos para ascender a <strong>{playerData.promotion.nextCategory}</strong>. El ascenso se procesará automáticamente.</>
                        }
                    </p>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', height: '24px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                            background: 'linear-gradient(90deg, var(--primary), var(--primary-light, #60a5fa))',
                            height: '100%',
                            width: `${playerData.promotion.progress}%`,
                            borderRadius: '12px',
                            transition: 'width 0.5s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 700,
                            minWidth: '40px',
                        }}>
                            {playerData.promotion.progress}%
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        <span>{playerData.promotion.currentPoints} pts</span>
                        <span>{playerData.promotion.threshold} pts</span>
                    </div>
                </div>
            )}

            <div className="tabs">
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Editar Perfil</button>
                <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historial</button>
                <button className={`tab ${activeTab === 'corrections' ? 'active' : ''}`} onClick={() => setActiveTab('corrections')}>Correcciones</button>
                <button className={`tab ${activeTab === 'howto' ? 'active' : ''}`} onClick={() => setActiveTab('howto')}>Cómo Funciona</button>
                <button className={`tab ${activeTab === 'terms' ? 'active' : ''}`} onClick={() => setActiveTab('terms')}>Términos</button>
            </div>

            {activeTab === 'profile' && (
                <div className="card fade-in">
                    <h3 className="card-title">Datos Personales</h3>
                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                            <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Mano Hábil</label><select className="form-select" value={handedness} onChange={(e) => setHandedness(e.target.value)}><option value="RIGHT">Diestro</option><option value="LEFT">Zurdo</option><option value="AMBIDEXTROUS">Ambidiestro</option></select></div>
                            <div className="form-group"><label className="form-label">Lado Preferido</label><select className="form-select" value={preferredSide} onChange={(e) => setPreferredSide(e.target.value)}><option value="DRIVE">Drive</option><option value="REVES">Revés</option><option value="BOTH">Ambos</option></select></div>
                        </div>
                        <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                    </form>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="card fade-in">
                    <h3 className="card-title">Historial de Puntos</h3>
                    {loading ? <div className="loading"><div className="spinner" /></div> : history.length === 0 ? (
                        <div className="empty-state"><p>No tenés historial de puntos todavía.</p></div>
                    ) : (
                        <div className="table-container">
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

            {activeTab === 'corrections' && (
                <div className="card fade-in">
                    <h3 className="card-title">Solicitar Corrección de Puntos</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                        Si notás un error en tus puntos, podés solicitar una corrección. Un administrador revisará tu caso.
                    </p>
                    <form onSubmit={handleCorrection}>
                        <div className="form-group">
                            <label className="form-label">Descripción del Error</label>
                            <textarea className="form-input" rows={4} value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} placeholder="Describí el error que encontraste..." required />
                        </div>
                        <button type="submit" className="btn btn-primary">Enviar Solicitud</button>
                    </form>
                </div>
            )}

            {activeTab === 'howto' && (
                <div className="card fade-in">
                    <h3 className="card-title">🏆 ¿Cómo Funciona Rankeate?</h3>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
                        <p><strong>Rankeate</strong> es el sistema de ranking oficial de padel de Argentina. Así funciona:</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📋 Registro</h4>
                        <p>Al registrarte, elegís tu <strong>categoría actual</strong> (1ra a 8va), tu <strong>localidad</strong> y tu <strong>género</strong> (Caballero o Dama). Arrancás con 0 puntos en el ranking.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>🎾 Torneos</h4>
                        <p>Participás en torneos organizados por clubes habilitados. Al finalizar el torneo, el club carga los resultados y el sistema te asigna puntos automáticamente según tu posición.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📊 Sistema de Puntos</h4>
                        <table className="data-table" style={{ marginTop: 'var(--space-sm)' }}>
                            <thead><tr><th>Posición</th><th>Torneo 250</th><th>Torneo 500</th><th>Torneo 1000</th></tr></thead>
                            <tbody>
                                <tr><td>🥇 Campeón</td><td>250 pts</td><td>500 pts</td><td>1000 pts</td></tr>
                                <tr><td>🥈 Finalista</td><td>150 pts</td><td>300 pts</td><td>600 pts</td></tr>
                                <tr><td>🥉 Semifinalista</td><td>75 pts</td><td>150 pts</td><td>300 pts</td></tr>
                                <tr><td>Cuartos de Final</td><td>40 pts</td><td>80 pts</td><td>160 pts</td></tr>
                            </tbody>
                        </table>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📈 Ranking</h4>
                        <p>Tu ranking se calcula sumando los <strong>mejores 8 resultados</strong> de los últimos <strong>12 meses</strong>. Los rankings están separados por <strong>Caballeros</strong> y <strong>Damas</strong>, y podés filtrar por categoría y localidad.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>🚀 Ascenso de Categoría</h4>
                        <p>Si acumulás suficientes puntos, <strong>ascendés automáticamente</strong> a la siguiente categoría. Los umbrales son crecientes:</p>
                        <table className="data-table" style={{ marginTop: 'var(--space-sm)' }}>
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
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>📝 Correcciones</h4>
                        <p>Si notás un error en tus puntos, podés solicitar una corrección desde la pestaña &quot;Correcciones&quot;. Un administrador la revisará y resolverá.</p>
                    </div>
                </div>
            )}

            {activeTab === 'terms' && (
                <div className="card fade-in">
                    <h3 className="card-title">📜 Términos y Condiciones</h3>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
                        <h4 style={{ color: 'var(--text-primary)' }}>1. Aceptación de los Términos</h4>
                        <p>Al registrarte y utilizar Rankeate, aceptás los siguientes términos y condiciones. Si no estás de acuerdo, no utilices la plataforma.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>2. Registro y Datos Personales</h4>
                        <p>El jugador debe proporcionar datos verídicos al registrarse, incluyendo nombre completo, DNI y categoría. Proporcionar información falsa puede resultar en la eliminación de la cuenta y anulación de puntos.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>3. Sistema de Puntos</h4>
                        <p>Los puntos son otorgados exclusivamente por clubes aprobados por la administración. No se pueden transferir, comprar ni intercambiar puntos entre jugadores.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>4. Rankings</h4>
                        <p>Los rankings se calculan automáticamente en base a los mejores 8 resultados de los últimos 12 meses. La administración se reserva el derecho de anular puntos en caso de irregularidades.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>5. Categorías</h4>
                        <p>La categoría es auto-declarada al momento del registro (1ra a 8va). La administración podrá reclasificar jugadores si los resultados indican una categoría incorrecta.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>6. Conducta</h4>
                        <p>Los jugadores deben mantener una conducta deportiva en todo momento. La administración puede suspender o eliminar cuentas por conducta antideportiva.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>7. Privacidad</h4>
                        <p>Tus datos personales (nombre, DNI, localidad) son visibles públicamente en los rankings. Tu email y teléfono son privados y no se comparten con terceros.</p>
                        <h4 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>8. Modificaciones</h4>
                        <p>Rankeate se reserva el derecho de modificar estos términos en cualquier momento. Los cambios se comunicarán a través de la plataforma.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
