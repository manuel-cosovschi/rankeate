'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Trophy, Calendar, Users, Home, LayoutDashboard, LogOut, Swords, Menu, X } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

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

    const getDashboardLabel = () => {
        if (!user) return '';
        switch (user.role) {
            case 'ADMIN': return 'Admin';
            case 'CLUB': return 'Mi Club';
            case 'PLAYER': return 'Mi Panel';
            default: return 'Panel';
        }
    };

    const isActive = (path: string) => pathname === path;

    const navLinks = [
        { href: '/', label: 'Rankings', icon: Home },
        { href: '/search', label: 'Jugadores', icon: Users },
        { href: '/bookings', label: 'Reservar', icon: Calendar },
        { href: '/matches', label: 'Partidos', icon: Swords },
    ];

    return (
        <nav className="navbar">
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>

                {/* Left: Brand + Nav Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', letterSpacing: '-0.5px' }}>
                        <Trophy size={22} color="var(--blue-600)" />
                        <span>Rankeate</span>
                    </Link>

                    <ul className="navbar-links" style={{ margin: 0, padding: 0 }}>
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <li key={href} style={{ listStyle: 'none' }}>
                                <Link
                                    href={href}
                                    className={isActive(href) ? 'active' : ''}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <Icon size={15} /> {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right: Search + Auth */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Search */}
                    <div className="navbar-search">
                        <Search size={15} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar jugador..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.currentTarget as HTMLInputElement).value;
                                    if (val.trim()) router.push(`/search?q=${encodeURIComponent(val.trim())}`);
                                }
                            }}
                        />
                    </div>

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {getDashboardLink() && (
                                <Link href={getDashboardLink()!} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)',
                                    background: 'var(--blue-50)', color: 'var(--blue-700)',
                                    textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
                                    border: '1px solid var(--blue-100)',
                                    transition: 'all 150ms ease',
                                }}>
                                    <LayoutDashboard size={15} /> {getDashboardLabel()}
                                </Link>
                            )}
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                            }}>
                                {user.email[0].toUpperCase()}
                            </div>
                            <button onClick={handleLogout} className="btn-ghost btn-icon" style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', padding: '0.35rem', borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 150ms ease',
                            }}>
                                <LogOut size={17} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <Link href="/login" style={{
                                padding: '0.4rem 0.85rem', fontSize: '0.85rem',
                                color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
                                borderRadius: 'var(--radius-md)',
                                transition: 'all 150ms ease',
                            }}>
                                Ingresar
                            </Link>
                            <Link href="/register" style={{
                                padding: '0.4rem 1rem', fontSize: '0.85rem',
                                background: 'var(--blue-600)', color: 'white',
                                textDecoration: 'none', borderRadius: 'var(--radius-full)',
                                fontWeight: 600, transition: 'all 150ms ease',
                                boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                            }}>
                                Unirse
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="navbar-menu-toggle"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Menu"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div style={{
                    position: 'absolute', top: '60px', left: 0, right: 0,
                    background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border-color)',
                    padding: 'var(--space-md) var(--space-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)',
                                    color: isActive(href) ? 'var(--blue-600)' : 'var(--text-secondary)',
                                    background: isActive(href) ? 'var(--blue-50)' : 'transparent',
                                    fontWeight: isActive(href) ? 600 : 500,
                                    fontSize: '0.9rem', textDecoration: 'none',
                                }}
                            >
                                <Icon size={18} /> {label}
                            </Link>
                        ))}
                        {user && getDashboardLink() && (
                            <Link
                                href={getDashboardLink()!}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)',
                                    color: 'var(--blue-600)', fontWeight: 600,
                                    fontSize: '0.9rem', textDecoration: 'none',
                                    background: 'var(--blue-50)', marginTop: '0.25rem',
                                }}
                            >
                                <LayoutDashboard size={18} /> {getDashboardLabel()}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
