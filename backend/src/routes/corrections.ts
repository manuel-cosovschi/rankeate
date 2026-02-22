import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('PLAYER'));

// ─── Submit correction request ──────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || message.trim().length < 10) {
            res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres' });
            return;
        }

        const player = await prisma.player.findUnique({ where: { userId: req.user!.userId } });
        if (!player) {
            res.status(404).json({ error: 'Perfil de jugador no encontrado' });
            return;
        }

        const correction = await prisma.correctionRequest.create({
            data: {
                playerUserId: req.user!.userId,
                playerId: player.id,
                message: message.trim(),
            },
        });

        res.status(201).json(correction);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al crear solicitud' });
    }
});

// ─── Get own correction requests ────────────────────
router.get('/me', async (req: AuthRequest, res: Response) => {
    try {
        const corrections = await prisma.correctionRequest.findMany({
            where: { playerUserId: req.user!.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(corrections);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
});

export default router;
