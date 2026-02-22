'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const SURFACES = [
    { value: 'CESPED_SINTETICO', label: 'Césped Sintético' },
    { value: 'CEMENTO', label: 'Cemento' },
    { value: 'CRISTAL', label: 'Cristal' },
    { value: 'OTRO', label: 'Otro' },
];

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const BLOCK_TYPES = [
    { value: 'MAINTENANCE', label: 'Mantenimiento' },
    { value: 'TOURNAMENT', label: 'Torneo' },
    { value: 'PRIVATE', label: 'Privado' },
];

export default function CourtsPage() {
    const { user, token, loading } = useAuth();
    const router = useRouter();
    const [courts, setCourts] = useState<any[]>([]);
    const [loadingCourts, setLoadingCourts] = useState(true);
    const [msg, setMsg] = useState('');
    const [activeTab, setActiveTab] = useState<'list' | 'add' | 'schedule' | 'blocks'>('list');
    const [selectedCourt, setSelectedCourt] = useState<any>(null);

    // New court form
    const [newName, setNewName] = useState('');
    const [newSurface, setNewSurface] = useState('CESPED_SINTETICO');
    const [newIndoor, setNewIndoor] = useState(false);

    // Schedule form
    const [schedules, setSchedules] = useState<any[]>(
        Array.from({ length: 7 }, (_, i) => ({
            dayOfWeek: i,
            openTime: '08:00',
            closeTime: '23:00',
            slotDuration: 60,
            pricePerSlot: 0,
            enabled: i >= 1 && i <= 6, // Mon-Sat enabled
        }))
    );

    // Block form
    const [blockType, setBlockType] = useState('MAINTENANCE');
    const [blockStart, setBlockStart] = useState('');
    const [blockEnd, setBlockEnd] = useState('');
    const [blockReason, setBlockReason] = useState('');

    useEffect(() => {
        if (!loading && (!user || user.role !== 'CLUB')) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (token) loadCourts();
    }, [token]);

    async function loadCourts() {
        try {
            setLoadingCourts(true);
            const data = await api.getMyCourts(token!);
            setCourts(data);
        } catch (e: any) {
            setMsg(e.message);
        } finally {
            setLoadingCourts(false);
        }
    }

    async function handleCreateCourt(e: React.FormEvent) {
        e.preventDefault();
        try {
            await api.createCourt(token!, { name: newName, surface: newSurface, isIndoor: newIndoor });
            setMsg('✅ Cancha creada');
            setNewName('');
            setActiveTab('list');
            loadCourts();
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    }

    async function handleSaveSchedule() {
        if (!selectedCourt) return;
        try {
            const enabled = schedules.filter(s => s.enabled);
            await api.setCourtSchedule(token!, selectedCourt.id, enabled.map(s => ({
                dayOfWeek: s.dayOfWeek,
                openTime: s.openTime,
                closeTime: s.closeTime,
                slotDuration: s.slotDuration,
                pricePerSlot: s.pricePerSlot,
            })));
            setMsg('✅ Horarios guardados');
            loadCourts();
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    }

    async function handleCreateBlock(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCourt) return;
        try {
            await api.createCourtBlock(token!, selectedCourt.id, {
                type: blockType,
                startAt: blockStart,
                endAt: blockEnd,
                reason: blockReason || undefined,
            });
            setMsg('✅ Bloqueo creado');
            setBlockStart('');
            setBlockEnd('');
            setBlockReason('');
            loadCourts();
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    }

    async function handleDeleteBlock(blockId: number) {
        try {
            await api.deleteCourtBlock(token!, blockId);
            setMsg('✅ Bloqueo eliminado');
            loadCourts();
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    }

    async function handleToggleCourt(court: any) {
        try {
            await api.updateCourt(token!, court.id, { isActive: !court.isActive });
            setMsg(court.isActive ? 'Cancha desactivada' : 'Cancha activada');
            loadCourts();
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    }

    function openSchedule(court: any) {
        setSelectedCourt(court);
        // Load existing schedules
        const existing = court.schedules || [];
        const newSchedules = Array.from({ length: 7 }, (_, i) => {
            const found = existing.find((s: any) => s.dayOfWeek === i);
            return {
                dayOfWeek: i,
                openTime: found?.openTime || '08:00',
                closeTime: found?.closeTime || '23:00',
                slotDuration: found?.slotDuration || 60,
                pricePerSlot: found?.pricePerSlot || 0,
                enabled: !!found,
            };
        });
        setSchedules(newSchedules);
        setActiveTab('schedule');
    }

    function openBlocks(court: any) {
        setSelectedCourt(court);
        setActiveTab('blocks');
    }

    if (loading || !user) return <div className="loading"><div className="spinner" /></div>;

    return (
        <main className="container" style={{ padding: 'var(--space-xl) var(--space-md)', maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>🏟️ Gestión de Canchas</h1>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/club')}>← Panel Club</button>
            </div>

            {msg && <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`} onClick={() => setMsg('')}>{msg}</div>}

            <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
                <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>Mis Canchas</button>
                <button className={`tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>+ Nueva Cancha</button>
                {selectedCourt && activeTab === 'schedule' && (
                    <button className="tab active">Horarios - {selectedCourt.name}</button>
                )}
                {selectedCourt && activeTab === 'blocks' && (
                    <button className="tab active">Bloqueos - {selectedCourt.name}</button>
                )}
            </div>

            {/* LIST */}
            {activeTab === 'list' && (
                <div>
                    {loadingCourts ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : courts.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No tenés canchas registradas aún.</p>
                            <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={() => setActiveTab('add')}>
                                + Agregar Cancha
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                            {courts.map(court => (
                                <div key={court.id} className="card" style={{ opacity: court.isActive ? 1 : 0.5 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 className="card-title">{court.name}</h3>
                                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)', flexWrap: 'wrap' }}>
                                                <span className="badge">{SURFACES.find(s => s.value === court.surface)?.label || court.surface}</span>
                                                <span className="badge">{court.isIndoor ? 'Techada' : 'Al aire libre'}</span>
                                                <span className={`badge ${court.isActive ? '' : 'badge-warning'}`}>
                                                    {court.isActive ? 'Activa' : 'Inactiva'}
                                                </span>
                                                {court.schedules?.length > 0 && (
                                                    <span className="badge badge-success">{court.schedules.length} día(s) configurados</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openSchedule(court)}>Horarios</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openBlocks(court)}>Bloqueos</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleToggleCourt(court)}>
                                                {court.isActive ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ADD COURT */}
            {activeTab === 'add' && (
                <div className="card">
                    <h3 className="card-title">Nueva Cancha</h3>
                    <form onSubmit={handleCreateCourt} style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: '400px' }}>
                        <div className="form-group">
                            <label className="form-label">Nombre</label>
                            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Cancha 1" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Superficie</label>
                            <select className="form-select" value={newSurface} onChange={e => setNewSurface(e.target.value)}>
                                {SURFACES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input type="checkbox" id="indoor" checked={newIndoor} onChange={e => setNewIndoor(e.target.checked)} />
                            <label htmlFor="indoor" className="form-label" style={{ margin: 0 }}>Techada</label>
                        </div>
                        <button type="submit" className="btn btn-primary">Crear Cancha</button>
                    </form>
                </div>
            )}

            {/* SCHEDULE */}
            {activeTab === 'schedule' && selectedCourt && (
                <div className="card">
                    <h3 className="card-title">Horarios - {selectedCourt.name}</h3>
                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        {schedules.map((sched, idx) => (
                            <div key={sched.dayOfWeek} style={{ display: 'grid', gridTemplateColumns: '120px 40px 1fr', gap: 'var(--space-sm)', alignItems: 'center', padding: 'var(--space-sm)', borderRadius: '8px', background: sched.enabled ? 'var(--bg-secondary)' : 'transparent' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                    <input type="checkbox" checked={sched.enabled} onChange={e => {
                                        const n = [...schedules]; n[idx] = { ...n[idx], enabled: e.target.checked }; setSchedules(n);
                                    }} />
                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{DAYS[sched.dayOfWeek]}</span>
                                </div>
                                <div />
                                {sched.enabled && (
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input type="time" className="form-input" style={{ width: '110px' }} value={sched.openTime} onChange={e => {
                                            const n = [...schedules]; n[idx] = { ...n[idx], openTime: e.target.value }; setSchedules(n);
                                        }} />
                                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>a</span>
                                        <input type="time" className="form-input" style={{ width: '110px' }} value={sched.closeTime} onChange={e => {
                                            const n = [...schedules]; n[idx] = { ...n[idx], closeTime: e.target.value }; setSchedules(n);
                                        }} />
                                        <select className="form-select" style={{ width: '100px' }} value={sched.slotDuration} onChange={e => {
                                            const n = [...schedules]; n[idx] = { ...n[idx], slotDuration: Number(e.target.value) }; setSchedules(n);
                                        }}>
                                            <option value={60}>60 min</option>
                                            <option value={90}>90 min</option>
                                            <option value={120}>120 min</option>
                                        </select>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>$</span>
                                            <input type="number" className="form-input" style={{ width: '90px' }} placeholder="Precio" value={sched.pricePerSlot / 100 || ''} onChange={e => {
                                                const n = [...schedules]; n[idx] = { ...n[idx], pricePerSlot: Math.round(Number(e.target.value) * 100) }; setSchedules(n);
                                            }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-primary" onClick={handleSaveSchedule}>Guardar Horarios</button>
                        <button className="btn btn-ghost" onClick={() => setActiveTab('list')}>Cancelar</button>
                    </div>
                </div>
            )}

            {/* BLOCKS */}
            {activeTab === 'blocks' && selectedCourt && (
                <div className="card">
                    <h3 className="card-title">Bloqueos - {selectedCourt.name}</h3>

                    {/* Existing blocks */}
                    {(selectedCourt.blocks || []).length > 0 && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>Bloqueos activos</h4>
                            <table className="data-table">
                                <thead><tr><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Razón</th><th></th></tr></thead>
                                <tbody>
                                    {selectedCourt.blocks.map((b: any) => (
                                        <tr key={b.id}>
                                            <td><span className="badge">{BLOCK_TYPES.find(t => t.value === b.type)?.label}</span></td>
                                            <td>{new Date(b.startAt).toLocaleString('es-AR')}</td>
                                            <td>{new Date(b.endAt).toLocaleString('es-AR')}</td>
                                            <td>{b.reason || '—'}</td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => handleDeleteBlock(b.id)}>Eliminar</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* New block form */}
                    <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>Nuevo bloqueo</h4>
                    <form onSubmit={handleCreateBlock} style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: '500px' }}>
                        <div className="form-group">
                            <label className="form-label">Tipo</label>
                            <select className="form-select" value={blockType} onChange={e => setBlockType(e.target.value)}>
                                {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                            <div className="form-group">
                                <label className="form-label">Desde</label>
                                <input type="datetime-local" className="form-input" value={blockStart} onChange={e => setBlockStart(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hasta</label>
                                <input type="datetime-local" className="form-input" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Razón (opcional)</label>
                            <input className="form-input" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ej: Reparación de red" />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button type="submit" className="btn btn-primary">Crear Bloqueo</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('list')}>Volver</button>
                        </div>
                    </form>
                </div>
            )}
        </main>
    );
}
