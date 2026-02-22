import { Router, Response, Request } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/audit';
import { createPaymentPreference, processWebhook, confirmMockPayment } from '../services/payment';
import { config } from '../config';

const router = Router();

// ─── Create payment preference (authenticated) ─────
router.post('/create-preference', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            res.status(400).json({ error: 'bookingId es requerido' });
            return;
        }

        // Verify booking belongs to user and is PENDING
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                court: { include: { club: true } },
            },
        });

        if (!booking) {
            res.status(404).json({ error: 'Reserva no encontrada' });
            return;
        }

        if (booking.createdById !== req.user!.userId) {
            res.status(403).json({ error: 'No tiene permisos sobre esta reserva' });
            return;
        }

        if (booking.status !== 'PENDING') {
            res.status(400).json({ error: 'La reserva no está en estado pendiente' });
            return;
        }

        if (booking.totalPrice <= 0) {
            // Free booking — confirm directly
            await prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'CONFIRMED', expiresAt: null },
            });
            res.json({ free: true, message: 'Reserva confirmada (sin costo)' });
            return;
        }

        const startFormatted = new Date(booking.startAt).toLocaleString('es-AR', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const result = await createPaymentPreference({
            bookingId,
            payerId: req.user!.userId,
            amount: booking.totalPrice,
            description: `Reserva ${booking.court.club.name} - ${booking.court.name} - ${startFormatted}`,
            backUrl: `${config.frontendUrl}/bookings`,
            notificationUrl: `${config.backendUrl}/api/payments/webhook`,
        });

        await logAudit(req.user!.userId, 'CREATE_PAYMENT_PREFERENCE', 'payment', result.payment.id, {
            bookingId,
            amount: booking.totalPrice,
        });

        res.json({
            paymentId: result.payment.id,
            preferenceUrl: result.preferenceUrl,
            amount: booking.totalPrice,
        });
    } catch (error: any) {
        console.error('Create preference error:', error);
        res.status(500).json({ error: 'Error al crear preferencia de pago' });
    }
});

// ─── Mercado Pago webhook (public, no auth) ─────────
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        console.log('📨 Payment webhook received:', JSON.stringify(req.body).substring(0, 200));

        const result = await processWebhook(req.body);

        console.log(`📨 Webhook result:`, result);

        if (result.processed && result.action === 'payment_approved_booking_confirmed') {
            console.log('✅ Payment approved, booking confirmed');
        }

        // Always return 200 to MP to prevent retries
        res.status(200).json({ ok: true, ...result });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        // Still return 200 to prevent MP from retrying
        res.status(200).json({ ok: false, error: 'Internal processing error' });
    }
});

// ─── Confirm mock payment (dev/testing only) ────────
router.post('/mock-confirm/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const paymentId = parseInt(req.params.id);

        const confirmed = await confirmMockPayment(paymentId);

        if (!confirmed) {
            res.status(400).json({ error: 'Pago no encontrado o no es de tipo mock' });
            return;
        }

        await logAudit(req.user!.userId, 'MOCK_PAYMENT_CONFIRM', 'payment', paymentId, {});

        res.json({ success: true, message: 'Pago mock confirmado, reserva confirmada' });
    } catch (error: any) {
        console.error('Mock confirm error:', error);
        res.status(500).json({ error: 'Error al confirmar pago' });
    }
});

// ─── Get payment status for booking ─────────────────
router.get('/booking/:bookingId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const bookingId = parseInt(req.params.bookingId);

        const payments = await prisma.payment.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'desc' },
        });

        res.json(payments);
    } catch (error: any) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Error al obtener pagos' });
    }
});

export default router;
