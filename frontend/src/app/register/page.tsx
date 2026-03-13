'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Trophy, User, Building2 } from 'lucide-react';

export default function RegisterPage() {
    const [tab, setTab] = useState<'player' | 'club'>('player');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [localities, setLocalities] = useState<any[]>([]);
    const { setAuth } = useAuth();
    const router = useRouter();

    const [pEmail, setPEmail] = useState('');
    const [pPassword, setPPassword] = useState('');
    const [pDni, setPDni] = useState('');
    const [pFirstName, setPFirstName] = useState('');
    const [pLastName, setPLastName] = useState('');
    const [pLocalityId, setPLocalityId] = useState('');
    const [pCategoryId, setPCategoryId] = useState('');
    const [pGender, setPGender] = useState('MALE');
    const [pHandedness, setPHandedness] = useState('RIGHT');
    const [pSide, setPSide] = useState('DRIVE');
    const [pPhone, setPPhone] = useState('');

    const [cEmail, setCEmail] = useState('');
    const [cPassword, setCPassword] = useState('');
    const [cClubName, setCClubName] = useState('');
    const [cLocalityId, setCLocalityId] = useState('');
    const [cAddress, setCAddress] = useState('');
    const [cPhone, setCPhone] = useState('');
    const [cManagerName, setCManagerName] = useState('');
    const [cManagerDni, setCManagerDni] = useState('');

    useEffect(() => {
        Promise.all([api.getCategories(), api.getLocalities()])
            .then(([cats, locs]) => { setCategories(cats); setLocalities(locs); })
            .catch(console.error);
    }, []);

    const handlePlayerRegister = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const data = await api.registerPlayer({ email: pEmail, password: pPassword, dni: pDni, firstName: pFirstName, lastName: pLastName, localityId: parseInt(pLocalityId), categoryId: parseInt(pCategoryId), gender: pGender, handedness: pHandedness, preferredSide: pSide, phone: pPhone || undefined });
            setAuth(data); router.push('/dashboard');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleClubRegister = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const data = await api.registerClub({ email: cEmail, password: cPassword, clubName: cClubName, localityId: parseInt(cLocalityId), address: cAddress || undefined, phone: cPhone || undefined, managerName: cManagerName, managerDni: cManagerDni });
            setAuth(data); router.push('/club');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="container auth-container fade-in" style={{ paddingTop: 'var(--space-2xl)', maxWidth: '520px' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: 'var(--radius-xl)',
                    background: 'linear-gradient(135deg, var(--blue-50), var(--blue-100))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto var(--space-md)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
                }}>
                    <Trophy size={28} color="var(--blue-600)" />
                </div>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                    Crear Cuenta
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    Unite al ranking oficial de padel
                </p>
            </div>

            <div className="card">
                {/* Tab Selector */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)',
                    padding: '0.3rem', marginBottom: 'var(--space-lg)',
                }}>
                    <button
                        onClick={() => setTab('player')}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.5rem', borderRadius: 'var(--radius-md)',
                            background: tab === 'player' ? 'var(--bg-primary)' : 'transparent',
                            boxShadow: tab === 'player' ? 'var(--shadow-sm)' : 'none',
                            border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)',
                            fontWeight: tab === 'player' ? 600 : 500,
                            color: tab === 'player' ? 'var(--text-primary)' : 'var(--text-muted)',
                            transition: 'all 150ms ease',
                        }}
                    >
                        <User size={16} /> Jugador
                    </button>
                    <button
                        onClick={() => setTab('club')}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.5rem', borderRadius: 'var(--radius-md)',
                            background: tab === 'club' ? 'var(--bg-primary)' : 'transparent',
                            boxShadow: tab === 'club' ? 'var(--shadow-sm)' : 'none',
                            border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)',
                            fontWeight: tab === 'club' ? 600 : 500,
                            color: tab === 'club' ? 'var(--text-primary)' : 'var(--text-muted)',
                            transition: 'all 150ms ease',
                        }}
                    >
                        <Building2 size={16} /> Club
                    </button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {tab === 'player' && (
                    <form onSubmit={handlePlayerRegister}>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={pFirstName} onChange={(e) => setPFirstName(e.target.value)} required placeholder="Juan" /></div>
                            <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={pLastName} onChange={(e) => setPLastName(e.target.value)} required placeholder="Pérez" /></div>
                        </div>
                        <div className="form-group"><label className="form-label">DNI</label><input className="form-input" value={pDni} onChange={(e) => setPDni(e.target.value)} required placeholder="12345678" /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} required placeholder="tu@email.com" /></div>
                        <div className="form-group"><label className="form-label">Contraseña</label><input className="form-input" type="password" value={pPassword} onChange={(e) => setPPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" /><span className="form-hint">Mínimo 6 caracteres</span></div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Localidad</label><select className="form-select" value={pLocalityId} onChange={(e) => setPLocalityId(e.target.value)} required><option value="">Seleccionar</option>{localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                            <div className="form-group"><label className="form-label">Categoría</label><select className="form-select" value={pCategoryId} onChange={(e) => setPCategoryId(e.target.value)} required><option value="">Seleccionar</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Género</label><select className="form-select" value={pGender} onChange={(e) => setPGender(e.target.value)} required><option value="MALE">Caballero</option><option value="FEMALE">Dama</option></select></div>
                            <div className="form-group"><label className="form-label">Mano hábil</label><select className="form-select" value={pHandedness} onChange={(e) => setPHandedness(e.target.value)}><option value="RIGHT">Diestro</option><option value="LEFT">Zurdo</option><option value="AMBIDEXTROUS">Ambidiestro</option></select></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Posición</label><select className="form-select" value={pSide} onChange={(e) => setPSide(e.target.value)}><option value="DRIVE">Drive</option><option value="REVES">Revés</option><option value="BOTH">Ambos</option></select></div>
                            <div className="form-group"><label className="form-label">Teléfono <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label><input className="form-input" value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="11-1234-5678" /></div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-sm)' }} disabled={loading}>{loading ? 'Registrando...' : 'Crear cuenta de Jugador'}</button>
                    </form>
                )}

                {tab === 'club' && (
                    <form onSubmit={handleClubRegister}>
                        <div className="form-group"><label className="form-label">Nombre del Club</label><input className="form-input" value={cClubName} onChange={(e) => setCClubName(e.target.value)} required placeholder="Club Deportivo..." /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required placeholder="club@email.com" /></div>
                        <div className="form-group"><label className="form-label">Contraseña</label><input className="form-input" type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" /><span className="form-hint">Mínimo 6 caracteres</span></div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Responsable</label><input className="form-input" value={cManagerName} onChange={(e) => setCManagerName(e.target.value)} required placeholder="Nombre completo" /></div>
                            <div className="form-group"><label className="form-label">DNI Responsable</label><input className="form-input" value={cManagerDni} onChange={(e) => setCManagerDni(e.target.value)} required placeholder="12345678" /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Localidad</label><select className="form-select" value={cLocalityId} onChange={(e) => setCLocalityId(e.target.value)} required><option value="">Seleccionar</option>{localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Dirección <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label><input className="form-input" value={cAddress} onChange={(e) => setCAddress(e.target.value)} placeholder="Av. Libertador 1234" /></div>
                        <div className="form-group"><label className="form-label">Teléfono <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label><input className="form-input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="11-1234-5678" /></div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-sm)' }} disabled={loading}>{loading ? 'Registrando...' : 'Registrar Club'}</button>
                        <div className="alert alert-info" style={{ marginTop: 'var(--space-md)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                            <span>El club quedará en estado pendiente hasta que un administrador lo apruebe.</span>
                        </div>
                    </form>
                )}

                <div className="auth-links"><p>¿Ya tenés cuenta? <Link href="/login" style={{ fontWeight: 600 }}>Iniciá sesión</Link></p></div>
            </div>
        </div>
    );
}
