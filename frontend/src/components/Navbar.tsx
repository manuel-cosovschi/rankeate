'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Trophy, Calendar, Users, Home, LayoutDashboard, LogOut, Swords, Menu, X } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Lock body scroll when mobile menu open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const handleLogout = () => {
        setMobileOpen(false);
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
        <>
            <nav className="navbar">
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>

                    {/* Left: Brand + Nav Links */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', letterSpacing: '-0.5px', flexShrink: 0 }}>
                            <Trophy size={22} color="var(--blue-600)" />
                            <span>Rankeate</span>
                        </Link>

                        <ul className="navbar-links" style={{ margin: 0, padding: 0 }}>
                            {navLinks.map(({ href, label, icon: Icon }) => (
                                <li key={href} style={{ listStyle: 'none' }}>
                                    <Link
                                        href={href}
                                        className={isActive(href) ? 'active' : ''}
                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                        <Icon size={15} /> {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right: Search + Auth */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Search — hidden on mobile via CSS */}
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
                            <div className="navbar-links" style={{ margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {getDashboardLink() && (
                                    <Link href={getDashboardLink()!} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                                        padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)',
                                        background: 'var(--blue-50)', color: 'var(--blue-700)',
                                        textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
                                        border: '1px solid var(--blue-100)',
                                        transition: 'all 150ms ease', whiteSpace: 'nowrap',
                                    }}>
                                        <LayoutDashboard size={15} /> {getDashboardLabel()}
                                    </Link>
                                )}
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                    flexShrink: 0,
                                }}>
                                    {user.email[0].toUpperCase()}
                                </div>
                                <button onClick={handleLogout} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: '0.35rem', borderRadius: 'var(--radius-md)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 150ms ease', minWidth: '32px', minHeight: '32px',
                                }}>
                                    <LogOut size={17} />
                                </button>
                            </div>
                        ) : (
                            <div className="navbar-links" style={{ margin: 0, padding: 0, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <Link href="/login" style={{
                                    padding: '0.4rem 0.85rem', fontSize: '0.85rem',
                                    color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500,
                                    borderRadius: 'var(--radius-md)', transition: 'all 150ms ease',
                                    whiteSpace: 'nowrap',
                                }}>
                                    Ingresar
                                </Link>
                                <Link href="/register" style={{
                                    padding: '0.4rem 1rem', fontSize: '0.85rem',
                                    background: 'var(--blue-600)', color: 'white',
                                    textDecoration: 'none', borderRadius: 'var(--radius-full)',
                                    fontWeight: 600, transition: 'all 150ms ease',
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.2)', whiteSpace: 'nowrap',
                                }}>
                                    Unirse
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className="navbar-menu-toggle"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={mobileOpen}
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Backdrop */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, top: '60px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 98,
                    }}
                />
            )}

            {/* Mobile Menu Panel */}
            <div style={{
                position: 'fixed', top: '60px', left: 0, right: 0,
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 99,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(-100%)',
                opacity: mobileOpen ? 1 : 0,
                transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease',
                pointerEvents: mobileOpen ? 'auto' : 'none',
                maxHeight: 'calc(100vh - 60px)',
                overflowY: 'auto',
            }}>
                {/* Search inside mobile menu */}
                <div style={{ padding: 'var(--space-md) var(--space-lg) var(--space-sm)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)',
                        padding: '0.5rem 1rem', border: '1px solid transparent',
                    }}>
                        <Search size={15} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar jugador..."
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', width: '100%' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.currentTarget as HTMLInputElement).value;
                                    if (val.trim()) { setMobileOpen(false); router.push(`/search?q=${encodeURIComponent(val.trim())}`); }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Nav Links */}
                <div style={{ padding: 'var(--space-sm) var(--space-md) var(--space-md)' }}>
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className="mobile-nav-item"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem', borderRadius: 'var(--radius-lg)',
                                color: isActive(href) ? 'var(--blue-600)' : 'var(--text-secondary)',
                                background: isActive(href) ? 'var(--blue-50)' : 'transparent',
                                fontWeight: isActive(href) ? 600 : 500,
                                fontSize: 'var(--font-size-sm)', textDecoration: 'none',
                                marginBottom: '2px',
                            }}
                        >
                            <Icon size={18} color={isActive(href) ? 'var(--blue-600)' : 'var(--text-muted)'} />
                            {label}
                        </Link>
                    ))}

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'var(--space-sm) 0' }} />

                    {user ? (
                        <>
                            {getDashboardLink() && (
                                <Link
                                    href={getDashboardLink()!}
                                    onClick={() => setMobileOpen(false)}
                                    className="mobile-nav-item"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem', borderRadius: 'var(--radius-lg)',
                                        color: 'var(--blue-600)', fontWeight: 600,
                                        fontSize: 'var(--font-size-sm)', textDecoration: 'none',
                                        background: 'var(--blue-50)', marginBottom: '2px',
                                    }}
                                >
                                    <LayoutDashboard size={18} color="var(--blue-600)" />
                                    {getDashboardLabel()}
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="mobile-nav-item"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem', borderRadius: 'var(--radius-lg)',
                                    color: 'var(--error)', fontWeight: 500,
                                    fontSize: 'var(--font-size-sm)', background: 'none',
                                    border: 'none', cursor: 'pointer', width: '100%',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                <LogOut size={18} color="var(--error)" />
                                Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem' }}>
                            <Link href="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                                Ingresar
                            </Link>
                            <Link href="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                Crear cuenta gratis
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
