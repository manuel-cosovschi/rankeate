'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
            const data = await api.registerPlayer({ email: pEmail, password: pPassword, dni: pDni, firstName: pFirstName, lastName: pLastName, localityId: parseInt(pLocalityId), categoryId: parseInt(pCategoryId), handedness: pHandedness, preferredSide: pSide, phone: pPhone || undefined });
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
        <div className="container auth-container fade-in" style={{ paddingTop: 'var(--space-xl)' }}>
            <div className="card">
                <h1>Registrarse</h1>
                <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
                    <button className={`tab ${tab === 'player' ? 'active' : ''}`} onClick={() => setTab('player')}>Jugador</button>
                    <button className={`tab ${tab === 'club' ? 'active' : ''}`} onClick={() => setTab('club')}>Club Organizador</button>
                </div>
                {error && <div className="alert alert-error">{error}</div>}

                {tab === 'player' && (
                    <form onSubmit={handlePlayerRegister}>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={pFirstName} onChange={(e) => setPFirstName(e.target.value)} required /></div>
                            <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={pLastName} onChange={(e) => setPLastName(e.target.value)} required /></div>
                        </div>
                        <div className="form-group"><label className="form-label">DNI</label><input className="form-input" value={pDni} onChange={(e) => setPDni(e.target.value)} required placeholder="12345678" /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} required /></div>
                        <div className="form-group"><label className="form-label">Contraseña (mín. 6 caracteres)</label><input className="form-input" type="password" value={pPassword} onChange={(e) => setPPassword(e.target.value)} required /></div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Localidad</label><select className="form-select" value={pLocalityId} onChange={(e) => setPLocalityId(e.target.value)} required><option value="">Seleccionar</option>{localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                            <div className="form-group"><label className="form-label">Categoría</label><select className="form-select" value={pCategoryId} onChange={(e) => setPCategoryId(e.target.value)} required><option value="">Seleccionar</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Mano hábil</label><select className="form-select" value={pHandedness} onChange={(e) => setPHandedness(e.target.value)}><option value="RIGHT">Diestro</option><option value="LEFT">Zurdo</option><option value="AMBIDEXTROUS">Ambidiestro</option></select></div>
                            <div className="form-group"><label className="form-label">Posición</label><select className="form-select" value={pSide} onChange={(e) => setPSide(e.target.value)}><option value="DRIVE">Drive</option><option value="REVES">Revés</option><option value="BOTH">Ambos</option></select></div>
                        </div>
                        <div className="form-group"><label className="form-label">Teléfono (opcional)</label><input className="form-input" value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="11-1234-5678" /></div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? 'Registrando...' : 'Registrar Jugador'}</button>
                    </form>
                )}

                {tab === 'club' && (
                    <form onSubmit={handleClubRegister}>
                        <div className="form-group"><label className="form-label">Nombre del Club</label><input className="form-input" value={cClubName} onChange={(e) => setCClubName(e.target.value)} required /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required /></div>
                        <div className="form-group"><label className="form-label">Contraseña (mín. 6 caracteres)</label><input className="form-input" type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required /></div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Responsable (nombre)</label><input className="form-input" value={cManagerName} onChange={(e) => setCManagerName(e.target.value)} required /></div>
                            <div className="form-group"><label className="form-label">DNI Responsable</label><input className="form-input" value={cManagerDni} onChange={(e) => setCManagerDni(e.target.value)} required /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Localidad</label><select className="form-select" value={cLocalityId} onChange={(e) => setCLocalityId(e.target.value)} required><option value="">Seleccionar</option>{localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Dirección (opcional)</label><input className="form-input" value={cAddress} onChange={(e) => setCAddress(e.target.value)} /></div>
                        <div className="form-group"><label className="form-label">Teléfono (opcional)</label><input className="form-input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} /></div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? 'Registrando...' : 'Registrar Club'}</button>
                        <div className="alert alert-info" style={{ marginTop: 'var(--space-md)' }}>El club quedará en estado PENDIENTE hasta que un administrador lo apruebe.</div>
                    </form>
                )}

                <div className="auth-links"><p>¿Ya tenés cuenta? <Link href="/login">Iniciá sesión</Link></p></div>
            </div>
        </div>
    );
}
