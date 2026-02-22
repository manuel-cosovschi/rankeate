import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit';
import { getAvailableSlots, createBooking } from '../services/booking';
import { BookingStatus } from '@prisma/client';

const router = Router();

// ─── Get availability (public) ──────────────────────
router.get('/availability', async (req, res: Response) => {
    try {
        const clubId = parseInt(req.query.clubId as string);
        const dateStr = req.query.date as string;

        if (!clubId || !dateStr) {
            res.status(400).json({ error: 'clubId y date son requeridos' });
            return;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            res.status(400).json({ error: 'Fecha inválida' });
            return;
        }

        // Get club courts
        const courts = await prisma.court.findMany({
            where: { clubId, isActive: true },
            include: { schedules: true },
            orderBy: { name: 'asc' },
        });

        // Get availability for each court
        const availability = await Promise.all(
            courts.map(async (court) => ({
                courtId: court.id,
                courtName: court.name,
                surface: court.surface,
                isIndoor: court.isIndoor,
                slots: await getAvailableSlots(court.id, date),
            }))
        );

        res.json({ date: dateStr, courts: availability });
    } catch (error: any) {
        console.error('Availability error:', error);
        res.status(500).json({ error: 'Error al obtener disponibilidad' });
    }
});

// ─── Get clubs with courts (public) ─────────────────
router.get('/clubs', async (req, res: Response) => {
    try {
        const localityId = req.query.localityId ? parseInt(req.query.localityId as string) : undefined;

        const clubs = await prisma.club.findMany({
            where: {
                status: 'APPROVED',
                courts: { some: { isActive: true } },
                ...(localityId && { localityId }),
            },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                locality: { select: { name: true } },
                _count: { select: { courts: { where: { isActive: true } } } },
            },
            orderBy: { name: 'asc' },
        });

        res.json(clubs);
    } catch (error: any) {
        console.error('Get clubs error:', error);
        res.status(500).json({ error: 'Error al obtener clubes' });
    }
});

// ─── Create booking (authenticated) ─────────────────
const createBookingSchema = z.object({
    courtId: z.number().int().positive(),
    date: z.string(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

router.post('/', authMiddleware, validate(createBookingSchema), async (req: AuthRequest, res: Response) => {
    try {
        const { courtId, date, startTime, endTime } = req.body;

        // Build full datetimes
        const startAt = new Date(`${date}T${startTime}:00`);
        const endAt = new Date(`${date}T${endTime}:00`);

        if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
            res.status(400).json({ error: 'Fecha/hora inválida' });
            return;
        }

        if (startAt >= endAt) {
            res.status(400).json({ error: 'La hora de fin debe ser posterior a la de inicio' });
            return;
        }

        if (startAt < new Date()) {
            res.status(400).json({ error: 'No se puede reservar en el pasado' });
            return;
        }

        // Get court with schedule
        const court = await prisma.court.findUnique({
            where: { id: courtId },
            include: { schedules: true, club: true },
        });

        if (!court || !court.isActive) {
            res.status(404).json({ error: 'Cancha no encontrada o inactiva' });
            return;
        }

        // Get price from schedule
        const dayOfWeek = startAt.getDay();
        const schedule = court.schedules.find(s => s.dayOfWeek === dayOfWeek);
        const totalPrice = schedule?.pricePerSlot || 0;

        const result = await createBooking({
            courtId,
            clubId: court.clubId,
            createdById: req.user!.userId,
            startAt,
            endAt,
            totalPrice,
        });

        if (result.error) {
            res.status(409).json({ error: result.error });
            return;
        }

        await logAudit(req.user!.userId, 'CREATE_BOOKING', 'booking', result.booking.id, {
            courtId,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
        });

        res.status(201).json(result.booking);
    } catch (error: any) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Error al crear reserva' });
    }
});

// ─── Cancel booking ─────────────────────────────────
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { reason } = req.body || {};

        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { club: true },
        });

        if (!booking) {
            res.status(404).json({ error: 'Reserva no encontrada' });
            return;
        }

        // Only creator or club owner can cancel
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        const isCreator = booking.createdById === req.user!.userId;
        const isClubOwner = club && club.id === booking.clubId;

        if (!isCreator && !isClubOwner) {
            res.status(403).json({ error: 'No tiene permisos para cancelar esta reserva' });
            return;
        }

        if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
            res.status(400).json({ error: 'Solo se pueden cancelar reservas pendientes o confirmadas' });
            return;
        }

        const updated = await prisma.booking.update({
            where: { id },
            data: {
                status: BookingStatus.CANCELLED,
                cancelledAt: new Date(),
                cancelNote: reason || null,
            },
        });

        await logAudit(req.user!.userId, 'CANCEL_BOOKING', 'booking', id, { reason });

        res.json(updated);
    } catch (error: any) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Error al cancelar reserva' });
    }
});

// ─── My bookings (player auth) ──────────────────────
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { createdById: req.user!.userId },
            include: {
                court: { select: { name: true, surface: true, isIndoor: true } },
                club: { select: { name: true, address: true } },
            },
            orderBy: { startAt: 'desc' },
            take: 50,
        });

        res.json(bookings);
    } catch (error: any) {
        console.error('My bookings error:', error);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
});

// ─── Club bookings (club auth) ──────────────────────
router.get('/club', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const club = await prisma.club.findUnique({ where: { userId: req.user!.userId } });
        if (!club) {
            res.status(404).json({ error: 'Club no encontrado' });
            return;
        }

        const dateStr = req.query.date as string;
        const courtId = req.query.courtId ? parseInt(req.query.courtId as string) : undefined;

        const where: any = { clubId: club.id };
        if (courtId) where.courtId = courtId;

        if (dateStr) {
            const date = new Date(dateStr);
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            where.startAt = { gte: dayStart, lte: dayEnd };
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                court: { select: { name: true } },
                createdBy: { select: { email: true } },
            },
            orderBy: { startAt: 'asc' },
            take: 100,
        });

        res.json(bookings);
    } catch (error: any) {
        console.error('Club bookings error:', error);
        res.status(500).json({ error: 'Error al obtener reservas del club' });
    }
});

export default router;
