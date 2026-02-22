import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { BEST_N_RESULTS, ROLLING_MONTHS } from '../services/points';
import { getPlayerRankingPosition } from '../services/ranking';

const router = Router();

// ─── Search players (public) ────────────────────────
router.get('/', async (req, res: Response) => {
    try {
        const query = (req.query.query as string) || '';
        const localityId = req.query.localityId ? parseInt(req.query.localityId as string) : undefined;
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const where: any = {};

        if (query) {
            where.OR = [
                { firstName: { contains: query } },
                { lastName: { contains: query } },
            ];
        }
        if (localityId) where.localityId = localityId;
        if (categoryId) where.currentCategoryId = categoryId;

        const [players, total] = await Promise.all([
            prisma.player.findMany({
                where,
                include: { locality: true, currentCategory: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { lastName: 'asc' },
            }),
            prisma.player.count({ where }),
        ]);

        const data = players.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            localityName: p.locality.name,
            categoryName: p.currentCategory.name,
            handedness: p.handedness,
            preferredSide: p.preferredSide,
        }));

        res.json({ data, total, page, limit });
    } catch (error: any) {
        console.error('Players search error:', error);
        res.status(500).json({ error: 'Error al buscar jugadores' });
    }
});

// ─── Get player profile (public) ────────────────────
router.get('/:id', async (req, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const player = await prisma.player.findUnique({
            where: { id },
            include: {
                locality: true,
                currentCategory: true,
                pointMovements: {
                    where: { voidedAt: null },
                    include: {
                        tournament: { select: { id: true, name: true, level: true, startDate: true } },
                        category: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                resultEntries: {
                    include: {
                        result: {
                            include: {
                                tournament: { select: { id: true, name: true, level: true, startDate: true } },
                                category: { select: { name: true } },
                            },
                        },
                    },
                    orderBy: { id: 'desc' },
                },
            },
        });

        if (!player) {
            res.status(404).json({ error: 'Jugador no encontrado' });
            return;
        }

        // Calculate 12-month total
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - ROLLING_MONTHS);

        const recentMovements = player.pointMovements
            .filter((m) => m.createdAt >= cutoffDate)
            .sort((a, b) => b.points - a.points)
            .slice(0, BEST_N_RESULTS);

        const totalPoints12m = recentMovements.reduce((sum, m) => sum + m.points, 0);

        const rankPosition = await getPlayerRankingPosition(player.id);

        res.json({
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            localityName: player.locality.name,
            localityId: player.localityId,
            categoryName: player.currentCategory.name,
            categoryId: player.currentCategoryId,
            handedness: player.handedness,
            preferredSide: player.preferredSide,
            birthDate: player.birthDate,
            totalPoints12m,
            rankPosition,
            tournaments: player.resultEntries.map((e) => ({
                tournamentId: e.result.tournament.id,
                tournamentName: e.result.tournament.name,
                level: e.result.tournament.level,
                date: e.result.tournament.startDate,
                category: e.result.category.name,
                position: e.finishPosition,
            })),
            pointHistory: player.pointMovements.map((m) => ({
                id: m.id,
                points: m.points,
                reason: m.reason,
                tournamentName: m.tournament.name,
                category: m.category.name,
                date: m.createdAt,
            })),
        });
    } catch (error: any) {
        console.error('Player profile error:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// ─── Edit own profile (player auth) ─────────────────
router.put('/me', authMiddleware, roleMiddleware('PLAYER'), async (req: AuthRequest, res: Response) => {
    try {
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) {
            res.status(404).json({ error: 'Perfil no encontrado' });
            return;
        }

        const { firstName, lastName, handedness, preferredSide, localityId, categoryId, phone, birthDate } = req.body;

        const updated = await prisma.player.update({
            where: { id: player.id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(handedness && { handedness }),
                ...(preferredSide && { preferredSide }),
                ...(localityId && { localityId }),
                ...(categoryId && { currentCategoryId: categoryId }),
                ...(phone !== undefined && { phone }),
                ...(birthDate && { birthDate: new Date(birthDate) }),
            },
            include: { locality: true, currentCategory: true },
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Update player error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// ─── Get own point history (player auth) ─────────────
router.get('/me/history', authMiddleware, roleMiddleware('PLAYER'), async (req: AuthRequest, res: Response) => {
    try {
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) {
            res.status(404).json({ error: 'Perfil no encontrado' });
            return;
        }

        const movements = await prisma.pointMovement.findMany({
            where: { playerId: player.id },
            include: {
                tournament: { select: { name: true, level: true, startDate: true } },
                category: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(movements);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

export default router;
