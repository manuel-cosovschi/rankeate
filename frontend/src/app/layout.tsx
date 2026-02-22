import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

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
                    <main style={{ minHeight: 'calc(100vh - 64px)' }}>
                        {children}
                    </main>
                    <footer className="footer">
                        <div className="container">
                            <div className="footer-grid">
                                <div className="footer-brand">
                                    <div className="footer-logo">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M12 8v8M8 12h8" /></svg>
                                        Rankeate
                                    </div>
                                    <p>La plataforma líder para rankings de padel amateur y profesional en Argentina.</p>
                                </div>
                                <div className="footer-col">
                                    <h4>Plataforma</h4>
                                    <ul>
                                        <li><a href="/">Rankings</a></li>
                                        <li><a href="/search">Jugadores</a></li>
                                        <li><a href="/register">Clubes</a></li>
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
                                <span>© 2025 Rankeate Argentina. Todos los derechos reservados.</span>
                            </div>
                        </div>
                    </footer>
                </AuthProvider>
            </body>
        </html>
    );
}
