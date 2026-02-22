import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { calculatePoints } from '../services/points';
import { logAudit } from '../services/audit';
import { ClubStatus, ResultStatus, TournamentStatus, TournamentLevel, FinishPosition } from '@prisma/client';

const router = Router();

// All routes require CLUB auth
router.use(authMiddleware);
router.use(roleMiddleware('CLUB'));

// ─── Get club dashboard ─────────────────────────────
router.get('/me', async (req: AuthRequest, res: Response) => {
    try {
        const club = await prisma.club.findUnique({
            where: { userId: req.user!.userId },
            include: {
                locality: true,
                tournaments: {
                    include: {
                        locality: true,
                        categories: { include: { category: true } },
                    },
                    orderBy: { startDate: 'desc' },
                },
            },
        });

        if (!club) {
            res.status(404).json({ error: 'Club no encontrado' });
            return;
        }

        res.json(club);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener club' });
    }
});

// ─── Create tournament ──────────────────────────────
const createTournamentSchema = z.object({
    name: z.string().min(3),
    localityId: z.number().int().positive(),
    level: z.enum(['LOCAL_250', 'REGIONAL_500', 'OPEN_1000']),
    startDate: z.string(),
    endDate: z.string().optional(),
    surface: z.string().optional(),
    observations: z.string().optional(),
    categoryIds: z.array(z.number().int().positive()).min(1),
});

router.post('/tournaments', validate(createTournamentSchema), async (req: AuthRequest, res: Response) => {
    try {
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) {
            res.status(404).json({ error: 'Club no encontrado' });
            return;
        }
        if (club.status !== ClubStatus.APPROVED) {
            res.status(403).json({ error: 'El club debe estar aprobado para crear torneos' });
            return;
        }

        const { name, localityId, level, startDate, endDate, surface, observations, categoryIds } = req.body;

        const tournament = await prisma.tournament.create({
            data: {
                clubId: club.id,
                name,
                localityId,
                level: level as TournamentLevel,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                surface: surface || null,
                observations: observations || null,
                categories: {
                    create: categoryIds.map((catId: number) => ({ categoryId: catId })),
                },
            },
            include: {
                categories: { include: { category: true } },
                locality: true,
            },
        });

        await logAudit(req.user!.userId, 'CREATE_TOURNAMENT', 'tournament', tournament.id, { name, level });

        res.status(201).json(tournament);
    } catch (error: any) {
        console.error('Create tournament error:', error);
        res.status(500).json({ error: 'Error al crear torneo' });
    }
});

// ─── Get tournament details ─────────────────────────
router.get('/tournaments/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) {
            res.status(404).json({ error: 'Club no encontrado' });
            return;
        }

        const tournament = await prisma.tournament.findFirst({
            where: { id, clubId: club.id },
            include: {
                locality: true,
                categories: { include: { category: true } },
                results: {
                    include: {
                        category: true,
                        entries: {
                            include: { player: { select: { id: true, firstName: true, lastName: true, dni: true } } },
                        },
                    },
                },
            },
        });

        if (!tournament) {
            res.status(404).json({ error: 'Torneo no encontrado' });
            return;
        }

        res.json(tournament);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener torneo' });
    }
});

// ─── Submit results (DRAFT) ─────────────────────────
const submitResultsSchema = z.object({
    categoryId: z.number().int().positive(),
    entries: z.array(z.object({
        playerId: z.number().int().positive(),
        finishPosition: z.enum(['CHAMPION', 'FINALIST', 'SEMIFINALIST', 'QUARTERFINALIST', 'ROUND_OF_16', 'PARTICIPANT']),
    })).min(1),
});

router.post('/tournaments/:id/results', validate(submitResultsSchema), async (req: AuthRequest, res: Response) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) {
            res.status(404).json({ error: 'Club no encontrado' });
            return;
        }

        const tournament = await prisma.tournament.findFirst({
            where: { id: tournamentId, clubId: club.id },
        });
        if (!tournament) {
            res.status(404).json({ error: 'Torneo no encontrado' });
            return;
        }

        const { categoryId, entries } = req.body;

        // Check if result already exists for this category
        const existingResult = await prisma.tournamentResult.findUnique({
            where: { tournamentId_categoryId: { tournamentId, categoryId } },
        });

        if (existingResult && existingResult.status === ResultStatus.CONFIRMED) {
            res.status(409).json({ error: 'Los resultados de esta categoría ya fueron confirmados' });
            return;
        }

        // Upsert result
        const result = await prisma.tournamentResult.upsert({
            where: { tournamentId_categoryId: { tournamentId, categoryId } },
            update: { status: ResultStatus.DRAFT },
            create: {
                tournamentId,
                categoryId,
                status: ResultStatus.DRAFT,
            },
        });

        // Delete existing entries and recreate
        await prisma.tournamentResultEntry.deleteMany({ where: { resultId: result.id } });

        await prisma.tournamentResultEntry.createMany({
            data: entries.map((e: any) => ({
                resultId: result.id,
                playerId: e.playerId,
                finishPosition: e.finishPosition as FinishPosition,
            })),
        });

        const fullResult = await prisma.tournamentResult.findUnique({
            where: { id: result.id },
            include: {
                category: true,
                entries: {
                    include: { player: { select: { id: true, firstName: true, lastName: true } } },
                },
            },
        });

        res.json(fullResult);
    } catch (error: any) {
        console.error('Submit results error:', error);
        res.status(500).json({ error: 'Error al cargar resultados' });
    }
});

// ─── Confirm results & award points ─────────────────
router.post('/tournaments/:id/results/confirm', async (req: AuthRequest, res: Response) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const { categoryId } = req.body;

        if (!categoryId) {
            res.status(400).json({ error: 'categoryId es requerido' });
            return;
        }

        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club || club.status !== ClubStatus.APPROVED) {
            res.status(403).json({ error: 'Club no aprobado' });
            return;
        }

        const tournament = await prisma.tournament.findFirst({
            where: { id: tournamentId, clubId: club.id },
        });
        if (!tournament) {
            res.status(404).json({ error: 'Torneo no encontrado' });
            return;
        }

        const result = await prisma.tournamentResult.findUnique({
            where: { tournamentId_categoryId: { tournamentId, categoryId } },
            include: { entries: true },
        });

        if (!result) {
            res.status(404).json({ error: 'Resultados no encontrados' });
            return;
        }

        if (result.status === ResultStatus.CONFIRMED) {
            res.status(409).json({ error: 'Los resultados ya fueron confirmados (idempotencia)' });
            return;
        }

        // Check no duplicate point movements exist
        const existingMovements = await prisma.pointMovement.findMany({
            where: { tournamentId, categoryId, voidedAt: null },
        });
        if (existingMovements.length > 0) {
            res.status(409).json({ error: 'Ya existen movimientos de puntos para este torneo/categoría' });
            return;
        }

        // Calculate and create point movements
        const pointMovements = result.entries.map((entry) => {
            const points = calculatePoints(tournament.level, entry.finishPosition);
            return {
                playerId: entry.playerId,
                tournamentId,
                categoryId,
                points,
                reason: `${entry.finishPosition} - ${tournament.name}`,
                createdByUserId: req.user!.userId,
            };
        });

        await prisma.$transaction([
            prisma.tournamentResult.update({
                where: { id: result.id },
                data: {
                    status: ResultStatus.CONFIRMED,
                    confirmedAt: new Date(),
                    confirmedBy: req.user!.userId,
                },
            }),
            prisma.tournament.update({
                where: { id: tournamentId },
                data: { status: TournamentStatus.CONFIRMED },
            }),
            prisma.pointMovement.createMany({ data: pointMovements }),
        ]);

        await logAudit(req.user!.userId, 'CONFIRM_RESULTS', 'tournament_result', result.id, {
            tournamentId,
            categoryId,
            entriesCount: result.entries.length,
            pointsAwarded: pointMovements.reduce((s, m) => s + m.points, 0),
        });

        res.json({
            message: 'Resultados confirmados y puntos asignados',
            pointsAwarded: pointMovements.map((m) => ({
                playerId: m.playerId,
                points: m.points,
                reason: m.reason,
            })),
        });
    } catch (error: any) {
        console.error('Confirm results error:', error);
        res.status(500).json({ error: 'Error al confirmar resultados' });
    }
});

// ─── Search player by DNI (for result entry) ────────
router.get('/players/search', async (req: AuthRequest, res: Response) => {
    try {
        const query = (req.query.query as string) || '';
        const dni = (req.query.dni as string) || '';

        const where: any = {};
        if (dni) {
            where.dni = dni;
        } else if (query) {
            where.OR = [
                { firstName: { contains: query } },
                { lastName: { contains: query } },
            ];
        }

        const players = await prisma.player.findMany({
            where,
            select: {
                id: true,
                dni: true,
                firstName: true,
                lastName: true,
                currentCategory: { select: { name: true } },
                locality: { select: { name: true } },
            },
            take: 20,
        });

        res.json(players);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al buscar jugadores' });
    }
});

export default router;
