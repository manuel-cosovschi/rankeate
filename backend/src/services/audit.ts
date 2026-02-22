import prisma from '../prisma';

export async function logAudit(
    actorUserId: number | null,
    action: string,
    entityType: string,
    entityId: number,
    payload?: Record<string, any>
): Promise<void> {
    await prisma.auditLog.create({
        data: {
            actorUserId,
            action,
            entityType,
            entityId,
            payload: payload ? JSON.stringify(payload) : null,
        },
    });
}
