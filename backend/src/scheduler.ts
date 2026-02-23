import { expirePendingBookings, expirePendingMatchParticipants } from './services/booking';
import prisma from './prisma';

const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds
const SLA_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function escalateStaleCorrections() {
    const thresholdDate = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
    const result = await prisma.correctionRequest.updateMany({
        where: {
            status: 'PENDING',
            clubId: { not: null },
            escalatedToAdmin: false,
            createdAt: { lt: thresholdDate }
        },
        data: {
            escalatedToAdmin: true
        }
    });
    return result.count;
}

/**
 * Start the background scheduler for periodic tasks.
 * Currently handles: expiring PENDING bookings and SLA escalation.
 */
export function startScheduler() {
    console.log('⏰ Scheduler started (booking expiration check every 60s, SLA check every 1h)');

    // Fast-running booking checks
    setInterval(async () => {
        try {
            const expired = await expirePendingBookings();
            if (expired > 0) {
                console.log(`⏰ Expired ${expired} pending booking(s)`);
            }

            const expiredParticipants = await expirePendingMatchParticipants();
            if (expiredParticipants > 0) {
                console.log(`⏰ Expired ${expiredParticipants} pending match participant(s)`);
            }
        } catch (error) {
            console.error('⏰ Scheduler expiration error:', error);
        }
    }, EXPIRY_CHECK_INTERVAL_MS);

    // Slower-running background checks
    setInterval(async () => {
        try {
            const escalated = await escalateStaleCorrections();
            if (escalated > 0) {
                console.log(`⏰ Escalated ${escalated} stale correction(s) to Admin`);
            }
        } catch (error) {
            console.error('⏰ Scheduler SLA error:', error);
        }
    }, SLA_CHECK_INTERVAL_MS);
}
