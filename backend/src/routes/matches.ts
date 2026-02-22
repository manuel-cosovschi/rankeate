import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MatchStatus, ParticipantStatus, BookingStatus } from '@prisma/client';
import { logAudit } from '../services/audit';

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// ─── Get Open Matches ──────────────────────────────────────────
router.get('/open', async (req, res) => {
    try {
        const localityId = req.query.localityId ? parseInt(req.query.localityId as string) : undefined;
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

        const where: any = {
            status: MatchStatus.OPEN,
            isPublic: true,
            booking: {
                startAt: { gt: new Date() },
                status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            }
        };

        if (localityId) where.booking.club = { localityId };

        // This query finds matches where at least one participant is of the requested category,
        // or just returns all open matches if no category filter.
        if (categoryId) {
            where.participants = {
                some: { player: { currentCategoryId: categoryId } }
            };
        }

        const matches = await prisma.match.findMany({
            where,
            include: {
                booking: {
                    include: {
                        club: { select: { id: true, name: true, locality: true } },
                        court: { select: { id: true, name: true, surface: true, isIndoor: true } },
                    }
                },
                participants: {
                    include: {
                        player: {
                            select: { id: true, firstName: true, lastName: true, currentCategory: { select: { name: true } } }
                        }
                    }
                }
            },
            orderBy: { booking: { startAt: 'asc' } },
            take: 50,
        });

        res.json(matches);
    } catch (error: any) {
        console.error('Error fetching open matches:', error);
        res.status(500).json({ error: 'Error al buscar partidos abiertos' });
    }
});

// ==========================================
// AUTHENTICATED ROUTES (PLAYER)
// ==========================================
router.use(authMiddleware);
router.use(roleMiddleware('PLAYER'));

// ─── Get My Matches ──────────────────────────────────────────────
router.get('/mine', async (req: AuthRequest, res: Response) => {
    try {
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const matches = await prisma.matchParticipant.findMany({
            where: { playerId: player.id },
            include: {
                match: {
                    include: {
                        booking: {
                            include: {
                                club: { select: { id: true, name: true } },
                                court: { select: { id: true, name: true } },
                            }
                        },
                        participants: {
                            include: {
                                player: { select: { id: true, firstName: true, lastName: true, currentCategory: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { match: { booking: { startAt: 'desc' } } }
        });

        res.json(matches.map(mp => ({ ...mp.match, myStatus: mp.status, mySplitAmount: mp.splitAmount, expiresAt: mp.expiresAt, paidAt: mp.paidAt })));
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener mis partidos' });
    }
});

// ─── Create Match (from existing booking) ────────────────────────
const createMatchSchema = z.object({
    bookingId: z.number().int().positive(),
    isPublic: z.boolean().default(false),
    notes: z.string().optional(),
    invitedPlayerIds: z.array(z.number().int().positive()).optional(),
});

router.post('/', validate(createMatchSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { bookingId, isPublic, notes, invitedPlayerIds } = req.body;
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        // Ensure booking exists, belongs to the user, and is not already a match
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { match: true }
        });

        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
        if (booking.createdById !== req.user!.userId) return res.status(403).json({ error: 'No sos el dueño de la reserva' });
        if (booking.match) return res.status(409).json({ error: 'Esta reserva ya tiene un partido asociado' });
        if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) {
            return res.status(400).json({ error: 'No se puede crear un partido para una reserva cancelada' });
        }

        const maxPlayers = 4; // Hardcoded for paddle/tennis doubles for now
        const splitAmount = Math.ceil(booking.totalPrice / maxPlayers); // Divide total price

        // The creator joins automatically as CONFIRMED (if booking was free/already paid) or PENDING_PAYMENT
        const creatorStatus = (booking.status === BookingStatus.CONFIRMED || booking.totalPrice === 0)
            ? ParticipantStatus.CONFIRMED
            : ParticipantStatus.PENDING_PAYMENT;

        const match = await prisma.match.create({
            data: {
                bookingId,
                createdById: req.user!.userId,
                isPublic,
                maxPlayers,
                notes,
                participants: {
                    create: [
                        { // Creator
                            playerId: player.id,
                            status: creatorStatus,
                            splitAmount,
                            joinedAt: new Date(),
                            expiresAt: creatorStatus === ParticipantStatus.PENDING_PAYMENT ? new Date(Date.now() + 5 * 60 * 1000) : null
                        },
                        // Invitees
                        ...(invitedPlayerIds || []).map((id: number) => ({
                            playerId: id,
                            status: ParticipantStatus.INVITED,
                            splitAmount,
                        }))
                    ]
                }
            },
            include: { participants: true }
        });

        await logAudit(req.user!.userId, 'CREATE_MATCH', 'match', match.id, { isPublic, invitedCount: invitedPlayerIds?.length || 0 });

        res.status(201).json(match);
    } catch (error: any) {
        console.error('Create match error:', error);
        res.status(500).json({ error: 'Error al crear partido' });
    }
});

// ─── Join Open Match ──────────────────────────────────────────────
router.post('/:id/join', async (req: AuthRequest, res: Response) => {
    try {
        const matchId = parseInt(req.params.id);
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { booking: true, participants: true }
        });

        if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
        if (!match.isPublic) return res.status(403).json({ error: 'El partido no es público' });
        if (match.status !== MatchStatus.OPEN) return res.status(400).json({ error: `El partido está en estado ${match.status}` });

        // Check if player already in match
        if (match.participants.some(p => p.playerId === player.id)) {
            return res.status(409).json({ error: 'Ya estás en este partido' });
        }

        // Count active spots (CONFIRMED, INVITED, PENDING_PAYMENT)
        const activeSpots = match.participants.filter((p: any) => !['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(p.status)).length;
        if (activeSpots >= match.maxPlayers) {
            return res.status(409).json({ error: 'El partido ya está lleno' });
        }

        const splitAmount = Math.ceil(match.booking.totalPrice / match.maxPlayers);

        // Transaction to add player securely
        const participant = await prisma.$transaction(async (tx) => {
            // Re-verify open seats with row lock if possible (omitted for brevity, relying on unique constraints + business logic)
            return await tx.matchParticipant.create({
                data: {
                    matchId,
                    playerId: player.id,
                    status: ParticipantStatus.PENDING_PAYMENT,
                    joinedAt: new Date(),
                    splitAmount,
                    // Give 5 minutes to pay
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                }
            });
        });

        await logAudit(req.user!.userId, 'JOIN_MATCH', 'match', matchId, { playerId: player.id });

        res.status(201).json(participant);
    } catch (error: any) {
        console.error('Join match error:', error);
        res.status(500).json({ error: 'Error al unirse al partido' });
    }
});

// ─── Accept Match & Generate Payment ─────────────────────────────
router.post('/:id/accept', async (req: AuthRequest, res: Response) => {
    try {
        const matchId = parseInt(req.params.id);
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const participant = await prisma.matchParticipant.findUnique({
            where: { matchId_playerId: { matchId, playerId: player.id } },
            include: { match: { include: { booking: true } } }
        });

        if (!participant) return res.status(404).json({ error: 'No sos participante de este partido' });

        if (participant.status === ParticipantStatus.CONFIRMED) {
            return res.status(409).json({ error: 'Ya estás confirmado en este partido' });
        }

        if (['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(participant.status)) {
            return res.status(400).json({ error: `Tu invitación expiró o fue cancelada (${participant.status})` });
        }

        const match = participant.match;
        const splitAmount = participant.splitAmount || 0;

        // If free, auto-confirm
        if (splitAmount === 0) {
            await prisma.matchParticipant.update({
                where: { id: participant.id },
                data: { status: ParticipantStatus.CONFIRMED, paidAt: new Date() }
            });
            // Try to set match FULL if everyone is confirmed
            await checkAndConfirmMatch(matchId);
            return res.json({ free: true, message: 'Partido confirmado (sin costo)' });
        }

        // Delegate to payment service to create preference for this user
        const { createPaymentPreference } = await import('../services/payment');
        const { config } = await import('../config');

        // Note: For split payments, we use the bookingId but a unique payerId
        // The webhook logic will need to handle marking the participant CONFIRMED instead of the full booking.
        const result = await createPaymentPreference({
            bookingId: match.booking.id,
            payerId: req.user!.userId,
            amount: splitAmount,
            description: `Seña Partido (Cuota 1/${match.maxPlayers})`,
            backUrl: `${config.frontendUrl}/matches/${matchId}/accept`,
            notificationUrl: `${config.backendUrl}/api/payments/webhook`,
            isSplitPayment: true,
            participantId: participant.id
        });

        res.json(result);
    } catch (error: any) {
        console.error('Accept match error:', error);
        res.status(500).json({ error: 'Error al aceptar el partido' });
    }
});

// Helper to check if match is full and confirmed
async function checkAndConfirmMatch(matchId: number) {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { participants: true, booking: true }
    });
    if (!match) return;

    const confirmed = match.participants.filter(p => p.status === ParticipantStatus.CONFIRMED).length;
    if (confirmed === match.maxPlayers) {
        await prisma.$transaction([
            prisma.match.update({ where: { id: matchId }, data: { status: MatchStatus.CONFIRMED } }),
            prisma.booking.update({ where: { id: match.bookingId }, data: { status: BookingStatus.CONFIRMED, expiresAt: null } })
        ]);
    } else if (confirmed === match.maxPlayers && match.status === MatchStatus.OPEN) {
        await prisma.match.update({ where: { id: matchId }, data: { status: MatchStatus.FULL } });
    }
}

// ─── Result Submission & Acceptance ──────────────────────────────────
const submitResultSchema = z.object({
    score: z.string(),
    winnersJson: z.string(), // e.g. "[1, 2]"
    losersJson: z.string(),  // e.g. "[3, 4]"
});

router.post('/:id/result', validate(submitResultSchema), async (req: AuthRequest, res: Response) => {
    try {
        const matchId = parseInt(req.params.id);
        const { score, winnersJson, losersJson } = req.body;

        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { participants: true, resultEntries: true }
        });

        if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
        if (match.status !== 'CONFIRMED' && match.status !== 'PLAYED') {
            return res.status(400).json({ error: 'El partido no está confirmado para jugarse' });
        }

        // Ensure user is participant
        if (!match.participants.some(p => p.playerId === player.id)) {
            return res.status(403).json({ error: 'No sos participante de este partido' });
        }

        if (match.resultEntries.length > 0) {
            return res.status(409).json({ error: 'Ya existe un resultado cargado para este partido. Debés aceptarlo o disputarlo.' });
        }

        const result = await prisma.matchResultEntry.create({
            data: {
                matchId,
                submittedById: req.user!.userId,
                score,
                winnersJson,
                losersJson,
                acceptance: 'PENDING'
            }
        });

        await prisma.match.update({ where: { id: matchId }, data: { status: 'PLAYED' } });
        await logAudit(req.user!.userId, 'SUBMIT_MATCH_RESULT', 'match', matchId, { score });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Submit match result error:', error);
        res.status(500).json({ error: 'Error al cargar resultado' });
    }
});

router.post('/:id/result/accept', async (req: AuthRequest, res: Response) => {
    try {
        const matchId = parseInt(req.params.id);
        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        // Logic omitted for brevity: 
        // 1. Mark player as accepted
        // 2. If all players accepted, change result acceptance to ACCEPTED
        // 3. Trigger points update service (similar to tournaments)

        const result = await prisma.matchResultEntry.findFirst({ where: { matchId } });
        if (!result) return res.status(404).json({ error: 'No hay resultado cargado' });

        await prisma.matchResultEntry.update({
            where: { id: result.id },
            data: { acceptance: 'ACCEPTED', resolvedAt: new Date() }
        });

        // Add 1 point reliability for completing the match gracefully
        await prisma.reliabilityEvent.create({
            data: { playerId: player.id, eventType: 'MATCH_OK', delta: 1, matchId }
        });

        await logAudit(req.user!.userId, 'ACCEPT_MATCH_RESULT', 'match', matchId, {});

        res.json({ message: 'Resultado aceptado' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al aceptar resultado' });
    }
});

router.post('/:id/result/dispute', async (req: AuthRequest, res: Response) => {
    try {
        const matchId = parseInt(req.params.id);
        const { reason } = req.body;

        const result = await prisma.matchResultEntry.findFirst({ where: { matchId } });
        if (!result) return res.status(404).json({ error: 'No hay resultado para disputar' });

        const updated = await prisma.matchResultEntry.update({
            where: { id: result.id },
            data: { acceptance: 'DISPUTED', disputeReason: reason }
        });

        await prisma.match.update({ where: { id: matchId }, data: { status: 'DISPUTED' } });

        // Log dispute event
        await logAudit(req.user!.userId, 'DISPUTE_MATCH_RESULT', 'match', matchId, { reason });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear disputa' });
    }
});

export default router;
