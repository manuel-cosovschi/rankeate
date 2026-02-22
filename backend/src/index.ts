import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRoutes from './routes/auth';
import rankingsRoutes from './routes/rankings';
import playersRoutes from './routes/players';
import clubsRoutes from './routes/clubs';
import adminRoutes from './routes/admin';
import correctionsRoutes from './routes/corrections';

const app = express();

// ─── Global middleware ──────────────────────────────
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { error: 'Demasiadas solicitudes, intente más tarde' },
});
app.use('/api/', limiter);

// Auth-specific stricter rate limit
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Demasiados intentos de autenticación' },
});
app.use('/api/auth/', authLimiter);

// ─── Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/corrections', correctionsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler ──────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Start ──────────────────────────────────────────
app.listen(config.port, () => {
    console.log(`\n🚀 Rankeate API running on http://localhost:${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}\n`);
});

export default app;
