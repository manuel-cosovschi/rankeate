import { expirePendingBookings } from './services/booking';

const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

/**
 * Start the background scheduler for periodic tasks.
 * Currently handles: expiring PENDING bookings past their expiresAt.
 */
export function startScheduler() {
    console.log('⏰ Scheduler started (booking expiration check every 60s)');

    setInterval(async () => {
        try {
            const expired = await expirePendingBookings();
            if (expired > 0) {
                console.log(`⏰ Expired ${expired} pending booking(s)`);
            }
        } catch (error) {
            console.error('⏰ Scheduler error:', error);
        }
    }, EXPIRY_CHECK_INTERVAL_MS);
}
