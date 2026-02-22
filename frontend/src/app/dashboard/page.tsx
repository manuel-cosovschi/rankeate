'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function DashboardPage() {
    const { user, playerData } = useAuth();
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
        api.getMyPointHistory?.()
            .then(setHistory).catch(() => { })
            .finally(() => setLoading(false));
    }, [playerData]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        try { await api.updateProfile({ firstName, lastName, phone, handedness, preferredSide }); setMsg('Perfil actualizado correctamente.'); }
        catch (err: any) { setMsg(err.message || 'Error al actualizar'); }
    };

    const handleCorrection = async (e: React.FormEvent) => {
        e.preventDefault(); setMsg('');
        try { await api.createCorrection({ text: correctionText }); setCorrectionText(''); setMsg('Solicitud enviada correctamente.'); }
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
                    <div className="card-stat-icon blue">🏆</div>
                    <div className="stat-label">PUNTOS TOTALES</div>
                    <div className="stat-value">{playerData?.totalPoints12m || 0}</div>
                </div>
                <div className="card card-stat">
                    <div className="card-stat-icon green">📊</div>
                    <div className="stat-label">CATEGORÍA</div>
                    <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>{playerData?.categoryName || '—'}</div>
                </div>
                <div className="card card-stat">
                    <div className="card-stat-icon yellow">📍</div>
                    <div className="stat-label">LOCALIDAD</div>
                    <div className="stat-value" style={{ fontSize: 'var(--font-size-xl)' }}>{playerData?.localityName || '—'}</div>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Editar Perfil</button>
                <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historial</button>
                <button className={`tab ${activeTab === 'correction' ? 'active' : ''}`} onClick={() => setActiveTab('correction')}>Correcciones</button>
            </div>

            {activeTab === 'profile' && (
                <div className="card fade-in">
                    <form onSubmit={handleProfileUpdate}>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                            <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Mano hábil</label><select className="form-select" value={handedness} onChange={(e) => setHandedness(e.target.value)}><option value="RIGHT">Diestro</option><option value="LEFT">Zurdo</option><option value="AMBIDEXTROUS">Ambidiestro</option></select></div>
                            <div className="form-group"><label className="form-label">Posición</label><select className="form-select" value={preferredSide} onChange={(e) => setPreferredSide(e.target.value)}><option value="DRIVE">Drive</option><option value="REVES">Revés</option><option value="BOTH">Ambos</option></select></div>
                        </div>
                        <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                        <div className="tip-box" style={{ marginBottom: 'var(--space-md)' }}>ℹ️ El DNI no puede modificarse. Si hay un error, usá la pestaña de correcciones.</div>
                        <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                    </form>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="fade-in">
                    {loading ? <div className="loading"><div className="spinner" /></div> : history.length === 0 ? (
                        <div className="empty-state"><p>Sin movimientos de puntos registrados.</p></div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>TORNEO</th><th>MOTIVO</th><th style={{ textAlign: 'right' }}>PUNTOS</th><th>FECHA</th></tr></thead>
                                <tbody>{history.map((m, i) => (
                                    <tr key={i}><td style={{ fontWeight: 600 }}>{m.tournamentName}</td><td style={{ color: 'var(--text-secondary)' }}>{m.reason}</td><td style={{ textAlign: 'right' }}><span className="points-badge">+{m.points}</span></td><td style={{ color: 'var(--text-muted)' }}>{new Date(m.date).toLocaleDateString('es-AR')}</td></tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'correction' && (
                <div className="card fade-in">
                    <h3 className="card-title">Solicitar Corrección</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>Describí el error que encontrás en tu perfil o puntos. Un administrador lo revisará.</p>
                    <form onSubmit={handleCorrection}>
                        <div className="form-group"><textarea className="form-textarea" value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} required placeholder="Describe el error..." /></div>
                        <button type="submit" className="btn btn-primary">Enviar Solicitud</button>
                    </form>
                </div>
            )}
        </div>
    );
}
