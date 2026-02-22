'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const getDashboardLink = () => {
        if (!user) return null;
        switch (user.role) {
            case 'ADMIN': return '/admin';
            case 'CLUB': return '/club';
            case 'PLAYER': return '/dashboard';
            default: return null;
        }
    };

    const getRoleLabel = () => {
        if (!user) return '';
        switch (user.role) {
            case 'ADMIN': return 'Admin';
            case 'CLUB': return 'Club';
            case 'PLAYER': return 'Jugador';
            default: return '';
        }
    };

    return (
        <nav className="navbar">
            <div className="container navbar-inner">
                <div className="navbar-brand">
                    <Link href="/" className="navbar-logo">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                            <path d="M12 8v8M8 12h8" />
                        </svg>
                        Rankeate
                    </Link>
                </div>

                <ul className="navbar-links">
                    <li><Link href="/">Inicio</Link></li>
                    <li><Link href="/search">Jugadores</Link></li>
                    <li><Link href="/">Rankings</Link></li>
                    <li><Link href="/bookings">Reservas</Link></li>
                    <li><Link href="/matches">Partidos</Link></li>
                </ul>

                <div className="navbar-search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input type="text" placeholder="Buscar jugadores..." onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val.trim()) router.push(`/search?q=${encodeURIComponent(val.trim())}`);
                        }
                    }} />
                </div>

                <div className="navbar-auth">
                    {user ? (
                        <>
                            {getDashboardLink() && (
                                <Link href={getDashboardLink()!} className="btn btn-ghost btn-sm">
                                    Panel
                                </Link>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="avatar avatar-sm avatar-blue" style={{ fontSize: '0.65rem' }}>
                                    {user.email[0].toUpperCase()}
                                </div>
                                <div style={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.email.split('@')[0]}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{getRoleLabel()}</div>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="btn btn-ghost btn-sm">Salir</button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="btn btn-ghost btn-sm">Ingresar</Link>
                            <Link href="/register" className="btn btn-primary btn-sm">Registrarse</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
