'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try { await api.forgotPassword(email); setSent(true); } catch { }
        setLoading(false);
    };

    return (
        <div className="container auth-container fade-in" style={{ paddingTop: 'var(--space-2xl)' }}>
            <div className="card">
                <h1>Recuperar Contraseña</h1>
                {sent ? (
                    <div className="alert alert-success">Si el email existe en nuestro sistema, recibirás un enlace de recuperación.</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email registrado</label>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </form>
                )}
                <div className="auth-links"><p><Link href="/login">Volver al login</Link></p></div>
            </div>
        </div>
    );
}
