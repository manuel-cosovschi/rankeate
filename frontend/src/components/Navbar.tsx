'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Search, Trophy, Calendar, Users, Home, LayoutDashboard, LogOut, Info } from 'lucide-react';

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

    return (
        <nav className="navbar" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', padding: '0.5rem 0' }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>

                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <Trophy size={20} color="var(--blue-600)" />
                        <span style={{ letterSpacing: '-0.5px' }}>Rankeate</span>
                    </Link>

                    {/* Links */}
                    <ul style={{ display: 'flex', gap: '1.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
                        <li><Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Home size={16} /> Inicio</Link></li>
                        <li><Link href="/search" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={16} /> Jugadores</Link></li>
                        <li><Link href="/bookings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={16} /> Reservar</Link></li>
                        <li><Link href="/matches" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Info size={16} /> Partidos</Link></li>
                    </ul>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Search minimal */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem' }} />
                        <input
                            type="text"
                            placeholder="Buscar jugador..."
                            style={{ padding: '0.35rem 0.75rem 0.35rem 2rem', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '0.85rem', width: '200px', outline: 'none', background: 'var(--bg-secondary)' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.currentTarget as HTMLInputElement).value;
                                    if (val.trim()) router.push(`/search?q=${encodeURIComponent(val.trim())}`);
                                }
                            }}
                        />
                    </div>

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {getDashboardLink() && (
                                <Link href={getDashboardLink()!} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: '20px', background: 'var(--blue-50)', color: 'var(--blue-700)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <LayoutDashboard size={16} /> Panel
                                </Link>
                            )}
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--blue-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                                {user.email[0].toUpperCase()}
                            </div>
                            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link href="/login" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Ingresar</Link>
                            <Link href="/register" style={{ padding: '0.35rem 1rem', fontSize: '0.85rem', background: 'var(--text-primary)', color: 'white', textDecoration: 'none', borderRadius: '20px', fontWeight: 500 }}>Unirse</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
