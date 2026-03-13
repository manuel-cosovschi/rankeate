'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Trophy, Mail, Lock } from 'lucide-react';

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
            const loggedInUser = await login(email, password);
            if (loggedInUser.role === 'PLAYER') router.push('/dashboard');
            else if (loggedInUser.role === 'CLUB') router.push('/club');
            else if (loggedInUser.role === 'ADMIN') router.push('/admin');
            else router.push('/');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container auth-container fade-in" style={{ paddingTop: 'var(--space-3xl)' }}>
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
                    Bienvenido a Rankeate
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    Ingresá a tu cuenta para continuar
                </p>
            </div>
            <div className="card">
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input className="form-input" style={{ paddingLeft: '2.5rem' }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
                        </div>
                    </div>
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>Contraseña</label>
                            <Link href="/forgot-password" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--blue-600)', fontWeight: 500 }}>¿Olvidaste tu contraseña?</Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input className="form-input" style={{ paddingLeft: '2.5rem' }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Tu contraseña" />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-sm)' }} disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
                <div className="auth-links">
                    <p>¿No tenés cuenta? <Link href="/register" style={{ fontWeight: 600 }}>Registrate gratis</Link></p>
                </div>
            </div>
        </div>
    );
}
