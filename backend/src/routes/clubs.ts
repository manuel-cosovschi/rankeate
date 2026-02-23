import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { calculatePoints } from '../services/points';
import { checkPromotionsForPlayers } from '../services/promotion';
import { logAudit } from '../services/audit';
import { ClubStatus, ResultStatus, TournamentStatus, FinishPosition, BookingStatus } from '@prisma/client';

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
                        category: true,
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

// ─── Update MP Token ────────────────────────────────
router.put('/me/token', async (req: AuthRequest, res: Response) => {
    try {
        const { mpAccessToken } = req.body;

        await prisma.club.update({
            where: { userId: req.user!.userId },
            data: { mpAccessToken: mpAccessToken || null },
        });

        res.json({ message: 'Token de Mercado Pago actualizado exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar token' });
    }
});

// ─── Create tournament ──────────────────────────────
const createTournamentSchema = z.object({
    name: z.string().min(3),
    localityId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    gender: z.enum(['MALE', 'FEMALE', 'MIXED']),
    startDate: z.string(),
    endDate: z.string().optional(),
    surface: z.string().optional(),
    observations: z.string().optional(),
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

        const { name, localityId, categoryId, gender, startDate, endDate, surface, observations } = req.body;

        const tournament = await prisma.tournament.create({
            data: {
                clubId: club.id,
                name,
                localityId,
                categoryId,
                gender,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                surface: surface || null,
                observations: observations || null,
                categories: {
                    create: [{ categoryId }],
                },
            },
            include: {
                category: true,
                locality: true,
            },
        });

        await logAudit(req.user!.userId, 'CREATE_TOURNAMENT', 'tournament', tournament.id, { name, categoryId, gender });

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
                category: true,
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

// ─── Manage Inscriptions (Phase 4) ──────────────────────
router.get('/tournaments/:id/inscriptions', async (req: AuthRequest, res: Response) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const tournament = await prisma.tournament.findFirst({
            where: { id: tournamentId, clubId: club.id },
        });
        if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }

        const inscriptions = await prisma.tournamentInscription.findMany({
            where: { tournamentId },
            include: { player: { select: { id: true, firstName: true, lastName: true, dni: true } } },
            orderBy: { createdAt: 'asc' },
        });

        res.json(inscriptions);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener inscripciones' });
    }
});

const updateInscriptionSchema = z.object({
    zone: z.string().nullable().optional(),
    bracketName: z.string().nullable().optional(),
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
});

router.put('/tournaments/:id/inscriptions/:inscriptionId', validate(updateInscriptionSchema), async (req: AuthRequest, res: Response) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const inscriptionId = parseInt(req.params.inscriptionId);

        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const tournament = await prisma.tournament.findFirst({
            where: { id: tournamentId, clubId: club.id },
        });
        if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }

        const { zone, bracketName, status } = req.body;

        const updated = await prisma.tournamentInscription.update({
            where: { id: inscriptionId, tournamentId },
            data: {
                ...(zone !== undefined && { zone }),
                ...(bracketName !== undefined && { bracketName }),
                ...(status !== undefined && { status }),
            },
            include: { player: { select: { id: true, firstName: true, lastName: true } } }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al actualizar inscripción' });
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
            const points = calculatePoints(entry.finishPosition);
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

        // Check for category promotions
        const playerIds = pointMovements.map(m => m.playerId);
        const promotions = await checkPromotionsForPlayers(playerIds);

        // Log promotions
        for (const promo of promotions) {
            await logAudit(req.user!.userId, 'CATEGORY_PROMOTION', 'player', promo.playerId, {
                from: promo.fromCategory,
                to: promo.toCategory,
                totalPoints: promo.totalPoints,
                threshold: promo.threshold,
            });
        }

        res.json({
            message: 'Resultados confirmados y puntos asignados',
            pointsAwarded: pointMovements.map((m) => ({
                playerId: m.playerId,
                points: m.points,
                reason: m.reason,
            })),
            promotions: promotions.length > 0 ? promotions : undefined,
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

// ─── Analytics (Phase 3) ────────────────────────────────────────────────

router.get('/me/analytics', authMiddleware, roleMiddleware('CLUB'), async (req: AuthRequest, res) => {
    try {
        const club = await prisma.club.findUnique({
            where: { userId: req.user!.userId }
        });

        if (!club) {
            return res.status(404).json({ error: 'Club no encontrado' });
        }

        // Basic stats for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const bookings = await prisma.booking.findMany({
            where: {
                clubId: club.id,
                createdAt: { gte: thirtyDaysAgo },
                status: BookingStatus.CONFIRMED
            },
            include: { match: true }
        });

        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

        // Matches vs regular bookings
        const matchmakingBookings = bookings.filter(b => b.match !== null).length;

        // Peak hours (simple aggregation)
        const hourCounts: Record<number, number> = {};
        bookings.forEach(b => {
            const h = new Date(b.startAt).getHours();
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        });

        res.json({
            period: 'Ultimos 30 dias',
            totalBookings,
            totalRevenue,
            matchmakingEngagment: {
                matchesCreated: matchmakingBookings,
                percentage: totalBookings > 0 ? (matchmakingBookings / totalBookings) * 100 : 0
            },
            peakHours: hourCounts
        });

    } catch (error) {
        console.error('Fetch analytics error:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// ─── Club Corrections / Disputes ─────────────────────────
router.get('/me/corrections', async (req: AuthRequest, res: Response) => {
    try {
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const corrections = await prisma.correctionRequest.findMany({
            where: {
                clubId: club.id,
                escalatedToAdmin: false
            },
            include: {
                player: { select: { firstName: true, lastName: true, dni: true } },
                user: { select: { email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(corrections);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener correcciones del club' });
    }
});

router.post('/me/corrections/:id/resolve', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { status, adminResponse } = req.body;

        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const correction = await prisma.correctionRequest.findFirst({
            where: { id, clubId: club.id, escalatedToAdmin: false }
        });

        if (!correction) {
            res.status(404).json({ error: 'Corrección no encontrada o ya escalada' });
            return;
        }

        if (!status || !['RESOLVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ error: 'Estado inválido' });
            return;
        }

        const updated = await prisma.correctionRequest.update({
            where: { id },
            data: {
                status: status,
                adminResponse: adminResponse || null,
                resolvedAt: new Date(),
            },
        });

        await logAudit(req.user!.userId, 'CLUB_RESOLVE_CORRECTION', 'correction_request', id, { status, adminResponse });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al resolver corrección' });
    }
});

export default router;
