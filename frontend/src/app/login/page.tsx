'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container auth-container fade-in" style={{ paddingTop: 'var(--space-2xl)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <div className="avatar avatar-lg avatar-blue" style={{ margin: '0 auto var(--space-md)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
            </div>
            <div className="card">
                <h1>Iniciar Sesión</h1>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
                <div className="auth-links">
                    <p><Link href="/forgot-password">¿Olvidaste tu contraseña?</Link></p>
                    <p style={{ marginTop: '0.5rem' }}>¿No tenés cuenta? <Link href="/register">Registrate</Link></p>
                </div>
            </div>
        </div>
    );
}
