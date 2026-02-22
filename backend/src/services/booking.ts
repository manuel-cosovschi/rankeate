import prisma from '../prisma';
import { BookingStatus } from '@prisma/client';

const BOOKING_EXPIRY_MINUTES = 10;

/**
 * Generate available time slots for a court on a given date.
 * Takes into account: schedule, existing bookings, and blocks.
 */
export async function getAvailableSlots(courtId: number, date: Date): Promise<{
    startTime: string;
    endTime: string;
    available: boolean;
    price: number;
}[]> {
    const dayOfWeek = date.getDay();

    // Get schedule for this day
    const schedule = await prisma.courtSchedule.findUnique({
        where: { courtId_dayOfWeek: { courtId, dayOfWeek } },
    });

    if (!schedule) return []; // Court closed on this day

    // Generate slots based on schedule
    const slots: { startTime: string; endTime: string; available: boolean; price: number }[] = [];

    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    for (let m = openMinutes; m + schedule.slotDuration <= closeMinutes; m += schedule.slotDuration) {
        const startH = Math.floor(m / 60);
        const startM = m % 60;
        const endTotal = m + schedule.slotDuration;
        const endH = Math.floor(endTotal / 60);
        const endM = endTotal % 60;

        slots.push({
            startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
            endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
            available: true,
            price: schedule.pricePerSlot,
        });
    }

    // Get date boundaries
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get existing bookings for this court on this date
    const bookings = await prisma.booking.findMany({
        where: {
            courtId,
            startAt: { gte: dayStart, lte: dayEnd },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
    });

    // Get blocks for this court on this date
    const blocks = await prisma.courtBlock.findMany({
        where: {
            courtId,
            startAt: { lte: dayEnd },
            endAt: { gte: dayStart },
        },
    });

    // Mark unavailable slots
    for (const slot of slots) {
        const slotStart = new Date(date);
        const [sH, sM] = slot.startTime.split(':').map(Number);
        slotStart.setHours(sH, sM, 0, 0);

        const slotEnd = new Date(date);
        const [eH, eM] = slot.endTime.split(':').map(Number);
        slotEnd.setHours(eH, eM, 0, 0);

        // Check bookings overlap
        for (const booking of bookings) {
            if (booking.startAt < slotEnd && booking.endAt > slotStart) {
                slot.available = false;
                break;
            }
        }

        // Check blocks overlap
        if (slot.available) {
            for (const block of blocks) {
                if (block.startAt < slotEnd && block.endAt > slotStart) {
                    slot.available = false;
                    break;
                }
            }
        }

        // Check if slot is in the past
        if (slot.available && slotStart < new Date()) {
            slot.available = false;
        }
    }

    return slots;
}

/**
 * Create a booking with concurrency control.
 * Uses a transaction with a conflict check to prevent double-booking.
 */
export async function createBooking(params: {
    courtId: number;
    clubId: number;
    createdById: number;
    startAt: Date;
    endAt: Date;
    totalPrice: number;
}): Promise<{ booking: any; error?: string }> {
    const { courtId, clubId, createdById, startAt, endAt, totalPrice } = params;

    try {
        const booking = await prisma.$transaction(async (tx) => {
            // Check for overlapping confirmed/pending bookings (SELECT FOR concurrency)
            const overlap = await tx.booking.findFirst({
                where: {
                    courtId,
                    status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
                    startAt: { lt: endAt },
                    endAt: { gt: startAt },
                },
            });

            if (overlap) {
                throw new Error('SLOT_TAKEN');
            }

            // Check for blocks
            const block = await tx.courtBlock.findFirst({
                where: {
                    courtId,
                    startAt: { lt: endAt },
                    endAt: { gt: startAt },
                },
            });

            if (block) {
                throw new Error('SLOT_BLOCKED');
            }

            // Create booking
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + BOOKING_EXPIRY_MINUTES);

            return tx.booking.create({
                data: {
                    clubId,
                    courtId,
                    createdById,
                    startAt,
                    endAt,
                    totalPrice,
                    status: BookingStatus.PENDING,
                    expiresAt,
                },
                include: {
                    court: true,
                    club: { select: { name: true } },
                },
            });
        });

        return { booking };
    } catch (error: any) {
        if (error.message === 'SLOT_TAKEN') {
            return { booking: null, error: 'Este horario ya está reservado' };
        }
        if (error.message === 'SLOT_BLOCKED') {
            return { booking: null, error: 'Este horario está bloqueado' };
        }
        throw error;
    }
}

/**
 * Expire pending bookings that have passed their expiration time.
 */
export async function expirePendingBookings(): Promise<number> {
    const result = await prisma.booking.updateMany({
        where: {
            status: BookingStatus.PENDING,
            expiresAt: { lte: new Date() },
        },
        data: {
            status: BookingStatus.EXPIRED,
        },
    });

    return result.count;
}

/**
 * Expire pending match participants that haven't paid in time.
 */
export async function expirePendingMatchParticipants(): Promise<number> {
    const expired = await prisma.matchParticipant.findMany({
        where: {
            status: 'PENDING_PAYMENT',
            expiresAt: { lte: new Date() },
        },
        include: { match: true }
    });

    if (expired.length === 0) return 0;

    await prisma.$transaction(
        expired.map(p => prisma.matchParticipant.update({
            where: { id: p.id },
            data: { status: 'EXPIRED' }
        }))
    );

    // Also, if any match was FULL but now has an expired spot, revert to OPEN
    const matchIds = [...new Set(expired.map(p => p.matchId))];
    for (const matchId of matchIds) {
        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (match?.status === 'FULL') {
            await prisma.match.update({ where: { id: matchId }, data: { status: 'OPEN' } });
        }
    }

    return expired.length;
}
