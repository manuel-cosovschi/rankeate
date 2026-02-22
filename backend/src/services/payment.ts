import prisma from '../prisma';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { config } from '../config';
import crypto from 'crypto';

/**
 * Payment service for Mercado Pago integration.
 * 
 * Flow:
 * 1. Player creates a booking (PENDING, 10-min expiry)
 * 2. Player requests a payment preference → MP checkout URL
 * 3. Player pays on MP → MP sends webhook → we process
 * 4. Webhook marks payment APPROVED → booking CONFIRMED
 * 
 * Idempotency: Each payment has a unique idempotencyKey.
 * If a webhook arrives twice, the second call is a no-op.
 */

/**
 * Create a Mercado Pago preference for a booking.
 * Returns the preference data including the checkout URL.
 */
export async function createPaymentPreference(params: {
    bookingId: number;
    payerId: number;
    amount: number;
    description: string;
    backUrl: string;
    notificationUrl: string;
}): Promise<{ payment: any; preferenceUrl: string }> {
    const { bookingId, payerId, amount, description, backUrl, notificationUrl } = params;

    // Generate idempotency key
    const idempotencyKey = `booking_${bookingId}_${payerId}_${Date.now()}`;

    // Check if a pending payment already exists for this booking
    const existing = await prisma.payment.findFirst({
        where: {
            bookingId,
            payerId,
            status: PaymentStatus.PENDING,
        },
    });

    if (existing?.externalId) {
        // Return existing preference
        return {
            payment: existing,
            preferenceUrl: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${existing.externalId}`,
        };
    }

    // Create MP preference via API
    const mpAccessToken = config.mpAccessToken;

    if (!mpAccessToken) {
        // If no MP token configured, create payment in mock mode
        const mockId = `mock_${crypto.randomUUID()}`;
        const payment = await prisma.payment.create({
            data: {
                bookingId,
                payerId,
                amount,
                type: 'FULL',
                status: PaymentStatus.PENDING,
                provider: 'mock',
                externalId: mockId,
                idempotencyKey,
            },
        });

        return {
            payment,
            preferenceUrl: `${backUrl}?mock=true&payment_id=${payment.id}`,
        };
    }

    // Real MP integration
    const preferenceBody = {
        items: [{
            title: description,
            quantity: 1,
            unit_price: amount / 100, // MP uses ARS, not centavos
            currency_id: 'ARS',
        }],
        back_urls: {
            success: `${backUrl}?status=approved`,
            failure: `${backUrl}?status=rejected`,
            pending: `${backUrl}?status=pending`,
        },
        notification_url: notificationUrl,
        external_reference: idempotencyKey,
        auto_return: 'approved',
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferenceBody),
    });

    const mpData: any = await mpResponse.json();

    if (!mpResponse.ok) {
        throw new Error(`MP error: ${mpData.message || 'Unknown error'}`);
    }

    // Create payment record
    const payment = await prisma.payment.create({
        data: {
            bookingId,
            payerId,
            amount,
            type: 'FULL',
            status: PaymentStatus.PENDING,
            provider: 'mercadopago',
            externalId: mpData.id,
            idempotencyKey,
        },
    });

    return {
        payment,
        preferenceUrl: mpData.init_point, // Checkout URL
    };
}

/**
 * Process a webhook notification from Mercado Pago.
 * Idempotent: duplicate calls are safe.
 */
export async function processWebhook(data: {
    type: string;
    data: { id: string };
}): Promise<{ processed: boolean; action?: string }> {
    if (data.type !== 'payment') {
        return { processed: false, action: 'ignored_non_payment' };
    }

    const mpPaymentId = data.data.id;

    // Fetch payment details from MP
    const mpAccessToken = config.mpAccessToken;

    let mpPayment: any;

    if (mpAccessToken) {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
            headers: { 'Authorization': `Bearer ${mpAccessToken}` },
        });
        mpPayment = await mpResponse.json();
    } else {
        // Mock mode: treat as approved
        mpPayment = { status: 'approved', external_reference: mpPaymentId };
    }

    // Find our payment by external reference or external payment
    const payment = await prisma.payment.findFirst({
        where: {
            OR: [
                { externalId: mpPayment.external_reference },
                { idempotencyKey: mpPayment.external_reference },
            ],
        },
        include: { booking: true },
    });

    if (!payment) {
        return { processed: false, action: 'payment_not_found' };
    }

    // Idempotency check
    if (payment.status === PaymentStatus.APPROVED) {
        return { processed: true, action: 'already_approved' };
    }

    if (mpPayment.status === 'approved') {
        // Update payment and booking in a transaction
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.APPROVED,
                    externalPayment: String(mpPaymentId),
                    paidAt: new Date(),
                },
            }),
            prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: BookingStatus.CONFIRMED,
                    expiresAt: null, // Clear expiry since it's now confirmed
                },
            }),
        ]);

        return { processed: true, action: 'payment_approved_booking_confirmed' };
    }

    if (mpPayment.status === 'rejected') {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.REJECTED },
        });

        return { processed: true, action: 'payment_rejected' };
    }

    return { processed: false, action: `unhandled_status_${mpPayment.status}` };
}

/**
 * Confirm a mock payment (for development/testing without MP).
 */
export async function confirmMockPayment(paymentId: number): Promise<boolean> {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
    });

    if (!payment || payment.provider !== 'mock' || payment.status !== PaymentStatus.PENDING) {
        return false;
    }

    await prisma.$transaction([
        prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.APPROVED,
                paidAt: new Date(),
            },
        }),
        prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
                status: BookingStatus.CONFIRMED,
                expiresAt: null,
            },
        }),
    ]);

    return true;
}
