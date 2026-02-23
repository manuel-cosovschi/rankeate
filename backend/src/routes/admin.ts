import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { ClubStatus, CorrectionStatus } from '@prisma/client';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

// ─── Pending clubs ──────────────────────────────────
router.get('/clubs/pending', async (req: AuthRequest, res: Response) => {
    try {
        const clubs = await prisma.club.findMany({
            where: { status: ClubStatus.PENDING },
            include: { locality: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(clubs);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener clubes pendientes' });
    }
});

// ─── All clubs ──────────────────────────────────────
router.get('/clubs', async (req: AuthRequest, res: Response) => {
    try {
        const status = req.query.status as string | undefined;
        const where: any = {};
        if (status) where.status = status;

        const clubs = await prisma.club.findMany({
            where,
            include: { locality: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(clubs);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener clubes' });
    }
});

// ─── Approve club ───────────────────────────────────
router.post('/clubs/:id/approve', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const club = await prisma.club.update({
            where: { id },
            data: { status: ClubStatus.APPROVED },
        });

        await logAudit(req.user!.userId, 'APPROVE_CLUB', 'club', id, { clubName: club.name });
        res.json({ message: 'Club aprobado', club });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al aprobar club' });
    }
});

// ─── Reject club ────────────────────────────────────
router.post('/clubs/:id/reject', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const club = await prisma.club.update({
            where: { id },
            data: { status: ClubStatus.REJECTED },
        });

        await logAudit(req.user!.userId, 'REJECT_CLUB', 'club', id, { clubName: club.name });
        res.json({ message: 'Club rechazado', club });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al rechazar club' });
    }
});

// ─── Void point movement ────────────────────────────
router.post('/point-movements/:id/void', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({ error: 'Se requiere una razón para anular' });
            return;
        }

        const movement = await prisma.pointMovement.findUnique({ where: { id } });
        if (!movement) {
            res.status(404).json({ error: 'Movimiento no encontrado' });
            return;
        }

        if (movement.voidedAt) {
            res.status(409).json({ error: 'El movimiento ya fue anulado' });
            return;
        }

        const voided = await prisma.pointMovement.update({
            where: { id },
            data: {
                voidedAt: new Date(),
                voidedBy: req.user!.userId,
                voidReason: reason,
            },
        });

        await logAudit(req.user!.userId, 'VOID_POINTS', 'point_movement', id, {
            playerId: movement.playerId,
            points: movement.points,
            reason,
        });

        res.json({ message: 'Movimiento anulado', movement: voided });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al anular movimiento' });
    }
});

// ─── Reports / Stats ────────────────────────────────
router.get('/reports', async (req: AuthRequest, res: Response) => {
    try {
        const [
            totalPlayers,
            totalClubs,
            pendingClubs,
            totalTournaments,
            recentTournaments,
            recentMovements,
            pendingCorrections,
        ] = await Promise.all([
            prisma.player.count(),
            prisma.club.count(),
            prisma.club.count({ where: { status: ClubStatus.PENDING } }),
            prisma.tournament.count(),
            prisma.tournament.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
            prisma.pointMovement.findMany({
                where: { voidedAt: null },
                include: {
                    player: { select: { firstName: true, lastName: true } },
                    tournament: { select: { name: true } },
                    category: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            prisma.correctionRequest.count({ where: { status: CorrectionStatus.PENDING } }),
        ]);

        res.json({
            stats: { totalPlayers, totalClubs, pendingClubs, totalTournaments, pendingCorrections },
            recentTournaments,
            recentMovements,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

// ─── Corrections list ───────────────────────────────
router.get('/corrections', async (req: AuthRequest, res: Response) => {
    try {
        const corrections = await prisma.correctionRequest.findMany({
            where: {
                OR: [
                    { clubId: null },
                    { escalatedToAdmin: true }
                ]
            },
            include: {
                player: { select: { firstName: true, lastName: true, dni: true } },
                user: { select: { email: true } },
                club: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(corrections);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener correcciones' });
    }
});

// ─── Resolve correction ─────────────────────────────
router.post('/corrections/:id/resolve', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { status, adminResponse } = req.body;

        if (!status || !['RESOLVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ error: 'Estado inválido' });
            return;
        }

        const correction = await prisma.correctionRequest.update({
            where: { id },
            data: {
                status: status as CorrectionStatus,
                adminResponse: adminResponse || null,
                resolvedAt: new Date(),
            },
        });

        await logAudit(req.user!.userId, 'RESOLVE_CORRECTION', 'correction_request', id, { status, adminResponse });

        res.json(correction);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al resolver corrección' });
    }
});

// ─── Audit log ──────────────────────────────────────
router.get('/audit-log', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                include: { actor: { select: { email: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditLog.count(),
        ]);

        res.json({ data: logs, total, page, limit });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener log de auditoría' });
    }
});

export default router;
