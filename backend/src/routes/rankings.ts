import { Router, Response } from 'express';
import prisma from '../prisma';
import { getRankings } from '../services/ranking';

const router = Router();

// ─── Get rankings (public) ──────────────────────────
router.get('/', async (req, res: Response) => {
    try {
        const localityId = req.query.localityId ? parseInt(req.query.localityId as string) : undefined;
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        const gender = req.query.gender as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const result = await getRankings({ localityId, categoryId, gender, page, limit });
        res.json(result);
    } catch (error: any) {
        console.error('Rankings error:', error);
        res.status(500).json({ error: 'Error al obtener rankings' });
    }
});

// ─── Get categories (public) ────────────────────────
router.get('/categories', async (req, res: Response) => {
    try {
        const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// ─── Get localities (public) ────────────────────────
router.get('/localities', async (req, res: Response) => {
    try {
        const localities = await prisma.locality.findMany({ orderBy: { name: 'asc' } });
        res.json(localities);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener localidades' });
    }
});

export default router;
