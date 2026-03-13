import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { Trophy } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Rankeate - El Ranking Oficial de Padel',
    description: 'Sistema oficial de rankings de padel de Argentina. Consultá posiciones, torneos y resultados por localidad y categoría.',
    keywords: 'ranking, padel, deportes, torneos, puntos, categorias, argentina',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
                <AuthProvider>
                    <Navbar />
                    <main style={{ minHeight: 'calc(100vh - 60px)' }}>
                        {children}
                    </main>
                    <footer className="footer">
                        <div className="container">
                            <div className="footer-grid">
                                <div className="footer-brand">
                                    <div className="footer-logo">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
                                            <path d="M4 22h16" />
                                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                                        </svg>
                                        Rankeate
                                    </div>
                                    <p>La plataforma líder para rankings de padel amateur y profesional en Argentina.</p>
                                </div>
                                <div className="footer-col">
                                    <h4>Plataforma</h4>
                                    <ul>
                                        <li><a href="/">Rankings</a></li>
                                        <li><a href="/search">Jugadores</a></li>
                                        <li><a href="/bookings">Reservar Cancha</a></li>
                                        <li><a href="/matches">Partidos</a></li>
                                    </ul>
                                </div>
                                <div className="footer-col">
                                    <h4>Soporte</h4>
                                    <ul>
                                        <li><a href="#">Centro de Ayuda</a></li>
                                        <li><a href="#">Reglamento</a></li>
                                        <li><a href="#">Contacto</a></li>
                                    </ul>
                                </div>
                                <div className="footer-col">
                                    <h4>Legal</h4>
                                    <ul>
                                        <li><a href="#">Política de Privacidad</a></li>
                                        <li><a href="#">Términos de Servicio</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="footer-bottom">
                                <span>&copy; {new Date().getFullYear()} Rankeate Argentina. Todos los derechos reservados.</span>
                            </div>
                        </div>
                    </footer>
                </AuthProvider>
            </body>
        </html>
    );
}
