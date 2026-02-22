import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit';

const router = Router();

// All routes require CLUB auth
router.use(authMiddleware);
router.use(roleMiddleware('CLUB'));

// Helper: get club from user
async function getClubForUser(userId: number) {
    return prisma.club.findUnique({ where: { userId } });
}

// ─── List club's courts ─────────────────────────────
router.get('/mine', async (req: AuthRequest, res: Response) => {
    try {
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const courts = await prisma.court.findMany({
            where: { clubId: club.id },
            include: {
                schedules: { orderBy: { dayOfWeek: 'asc' } },
                blocks: {
                    where: { endAt: { gte: new Date() } },
                    orderBy: { startAt: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });

        res.json(courts);
    } catch (error: any) {
        console.error('Get courts error:', error);
        res.status(500).json({ error: 'Error al obtener canchas' });
    }
});

// ─── Create court ───────────────────────────────────
const createCourtSchema = z.object({
    name: z.string().min(1).max(100),
    surface: z.enum(['CESPED_SINTETICO', 'CEMENTO', 'CRISTAL', 'OTRO']).optional(),
    isIndoor: z.boolean().optional(),
});

router.post('/', validate(createCourtSchema), async (req: AuthRequest, res: Response) => {
    try {
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const { name, surface, isIndoor } = req.body;

        const court = await prisma.court.create({
            data: {
                clubId: club.id,
                name,
                surface: surface || 'CESPED_SINTETICO',
                isIndoor: isIndoor || false,
            },
        });

        await logAudit(req.user!.userId, 'CREATE_COURT', 'court', court.id, { name, surface });

        res.status(201).json(court);
    } catch (error: any) {
        console.error('Create court error:', error);
        res.status(500).json({ error: 'Error al crear cancha' });
    }
});

// ─── Update court ────────────────────────────────────
const updateCourtSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    surface: z.enum(['CESPED_SINTETICO', 'CEMENTO', 'CRISTAL', 'OTRO']).optional(),
    isIndoor: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

router.put('/:id', validate(updateCourtSchema), async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const court = await prisma.court.findFirst({ where: { id, clubId: club.id } });
        if (!court) { res.status(404).json({ error: 'Cancha no encontrada' }); return; }

        const { name, surface, isIndoor, isActive } = req.body;

        const updated = await prisma.court.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(surface !== undefined && { surface }),
                ...(isIndoor !== undefined && { isIndoor }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        await logAudit(req.user!.userId, 'UPDATE_COURT', 'court', id, req.body);

        res.json(updated);
    } catch (error: any) {
        console.error('Update court error:', error);
        res.status(500).json({ error: 'Error al actualizar cancha' });
    }
});

// ─── Delete (deactivate) court ──────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const court = await prisma.court.findFirst({ where: { id, clubId: club.id } });
        if (!court) { res.status(404).json({ error: 'Cancha no encontrada' }); return; }

        await prisma.court.update({ where: { id }, data: { isActive: false } });

        await logAudit(req.user!.userId, 'DEACTIVATE_COURT', 'court', id, {});

        res.json({ message: 'Cancha desactivada' });
    } catch (error: any) {
        console.error('Delete court error:', error);
        res.status(500).json({ error: 'Error al desactivar cancha' });
    }
});

// ─── Set weekly schedule ────────────────────────────
const scheduleSchema = z.object({
    schedules: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        slotDuration: z.number().int().min(30).max(180).optional(),
        pricePerSlot: z.number().int().min(0).optional(),
    })),
});

router.put('/:id/schedule', validate(scheduleSchema), async (req: AuthRequest, res: Response) => {
    try {
        const courtId = parseInt(req.params.id);
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const court = await prisma.court.findFirst({ where: { id: courtId, clubId: club.id } });
        if (!court) { res.status(404).json({ error: 'Cancha no encontrada' }); return; }

        const { schedules } = req.body;

        // Upsert each day schedule
        for (const sched of schedules) {
            await prisma.courtSchedule.upsert({
                where: { courtId_dayOfWeek: { courtId, dayOfWeek: sched.dayOfWeek } },
                update: {
                    openTime: sched.openTime,
                    closeTime: sched.closeTime,
                    slotDuration: sched.slotDuration || 60,
                    pricePerSlot: sched.pricePerSlot || 0,
                },
                create: {
                    courtId,
                    dayOfWeek: sched.dayOfWeek,
                    openTime: sched.openTime,
                    closeTime: sched.closeTime,
                    slotDuration: sched.slotDuration || 60,
                    pricePerSlot: sched.pricePerSlot || 0,
                },
            });
        }

        await logAudit(req.user!.userId, 'UPDATE_SCHEDULE', 'court', courtId, { days: schedules.length });

        const updatedSchedules = await prisma.courtSchedule.findMany({
            where: { courtId },
            orderBy: { dayOfWeek: 'asc' },
        });

        res.json(updatedSchedules);
    } catch (error: any) {
        console.error('Set schedule error:', error);
        res.status(500).json({ error: 'Error al configurar horarios' });
    }
});

// ─── Create block ────────────────────────────────────
const blockSchema = z.object({
    type: z.enum(['MAINTENANCE', 'TOURNAMENT', 'PRIVATE']).optional(),
    startAt: z.string(),
    endAt: z.string(),
    reason: z.string().optional(),
});

router.post('/:id/blocks', validate(blockSchema), async (req: AuthRequest, res: Response) => {
    try {
        const courtId = parseInt(req.params.id);
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const court = await prisma.court.findFirst({ where: { id: courtId, clubId: club.id } });
        if (!court) { res.status(404).json({ error: 'Cancha no encontrada' }); return; }

        const { type, startAt, endAt, reason } = req.body;

        const block = await prisma.courtBlock.create({
            data: {
                courtId,
                type: type || 'MAINTENANCE',
                startAt: new Date(startAt),
                endAt: new Date(endAt),
                reason: reason || null,
            },
        });

        await logAudit(req.user!.userId, 'CREATE_BLOCK', 'court_block', block.id, { courtId, type, startAt, endAt });

        res.status(201).json(block);
    } catch (error: any) {
        console.error('Create block error:', error);
        res.status(500).json({ error: 'Error al crear bloqueo' });
    }
});

// ─── Delete block ────────────────────────────────────
router.delete('/blocks/:blockId', async (req: AuthRequest, res: Response) => {
    try {
        const blockId = parseInt(req.params.blockId);
        const club = await getClubForUser(req.user!.userId);
        if (!club) { res.status(404).json({ error: 'Club no encontrado' }); return; }

        const block = await prisma.courtBlock.findUnique({
            where: { id: blockId },
            include: { court: true },
        });
        if (!block || block.court.clubId !== club.id) {
            res.status(404).json({ error: 'Bloqueo no encontrado' });
            return;
        }

        await prisma.courtBlock.delete({ where: { id: blockId } });

        await logAudit(req.user!.userId, 'DELETE_BLOCK', 'court_block', blockId, {});

        res.json({ message: 'Bloqueo eliminado' });
    } catch (error: any) {
        console.error('Delete block error:', error);
        res.status(500).json({ error: 'Error al eliminar bloqueo' });
    }
});

export default router;
