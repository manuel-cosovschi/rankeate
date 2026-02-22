import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { logAudit } from '../services/audit';

const router = Router();

// ─── Schemas ──────────────────────────────────────────
const registerPlayerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    dni: z.string().min(7, 'DNI inválido').max(10),
    firstName: z.string().min(2, 'Nombre muy corto'),
    lastName: z.string().min(2, 'Apellido muy corto'),
    localityId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    handedness: z.enum(['RIGHT', 'LEFT', 'AMBIDEXTROUS']).optional(),
    preferredSide: z.enum(['DRIVE', 'REVES', 'BOTH']).optional(),
    birthDate: z.string().optional(),
    phone: z.string().optional(),
});

const registerClubSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    clubName: z.string().min(2),
    localityId: z.number().int().positive(),
    address: z.string().optional(),
    phone: z.string().optional(),
    cuit: z.string().optional(),
    managerName: z.string().min(2),
    managerDni: z.string().min(7).max(10),
    website: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// ─── Register Player ─────────────────────────────────
router.post('/register-player', validate(registerPlayerSchema), async (req, res: Response) => {
    try {
        const { email, password, dni, firstName, lastName, localityId, categoryId, handedness, preferredSide, birthDate, phone } = req.body;

        // Check unique email
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            res.status(409).json({ error: 'Email ya registrado' });
            return;
        }

        // Check unique DNI
        const existingDni = await prisma.player.findUnique({ where: { dni } });
        if (existingDni) {
            res.status(409).json({ error: 'DNI ya registrado' });
            return;
        }

        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: UserRole.PLAYER,
            },
        });

        const player = await prisma.player.create({
            data: {
                userId: user.id,
                dni,
                firstName,
                lastName,
                localityId,
                currentCategoryId: categoryId,
                handedness: handedness || 'RIGHT',
                preferredSide: preferredSide || 'DRIVE',
                birthDate: birthDate ? new Date(birthDate) : null,
                phone: phone || null,
            },
        });

        await logAudit(user.id, 'REGISTER_PLAYER', 'player', player.id, { email, dni });

        const accessToken = signAccessToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

        await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

        res.status(201).json({
            user: { id: user.id, email: user.email, role: user.role },
            player: { id: player.id, firstName, lastName, dni },
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        console.error('Register player error:', error);
        res.status(500).json({ error: 'Error al registrar jugador' });
    }
});

// ─── Register Club ───────────────────────────────────
router.post('/register-club', validate(registerClubSchema), async (req, res: Response) => {
    try {
        const { email, password, clubName, localityId, address, phone, cuit, managerName, managerDni, website } = req.body;

        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            res.status(409).json({ error: 'Email ya registrado' });
            return;
        }

        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
            data: { email, passwordHash, role: UserRole.CLUB },
        });

        const club = await prisma.club.create({
            data: {
                userId: user.id,
                name: clubName,
                localityId,
                address: address || null,
                email,
                phone: phone || null,
                cuit: cuit || null,
                managerName,
                managerDni,
                website: website || null,
            },
        });

        await logAudit(user.id, 'REGISTER_CLUB', 'club', club.id, { clubName, email });

        const accessToken = signAccessToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

        res.status(201).json({
            user: { id: user.id, email, role: user.role },
            club: { id: club.id, name: clubName, status: club.status },
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        console.error('Register club error:', error);
        res.status(500).json({ error: 'Error al registrar club' });
    }
});

// ─── Login ───────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const valid = await comparePassword(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const accessToken = signAccessToken({ userId: user.id, role: user.role });
        const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

        // Get associated data
        let playerData = null;
        let clubData = null;

        if (user.role === UserRole.PLAYER) {
            playerData = await prisma.player.findUnique({
                where: { userId: user.id },
                select: { id: true, firstName: true, lastName: true, dni: true },
            });
        } else if (user.role === UserRole.CLUB) {
            clubData = await prisma.club.findUnique({
                where: { userId: user.id },
                select: { id: true, name: true, status: true },
            });
        }

        res.json({
            user: { id: user.id, email: user.email, role: user.role },
            player: playerData,
            club: clubData,
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// ─── Refresh ─────────────────────────────────────────
router.post('/refresh', async (req, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh token requerido' });
            return;
        }

        const decoded = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user || user.refreshToken !== refreshToken) {
            res.status(401).json({ error: 'Refresh token inválido' });
            return;
        }

        const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
        const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error: any) {
        res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
});

// ─── Logout ──────────────────────────────────────────
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        await prisma.user.update({
            where: { id: req.user!.userId },
            data: { refreshToken: null },
        });
        res.json({ message: 'Sesión cerrada' });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

// ─── Forgot Password (mock) ─────────────────────────
router.post('/forgot-password', async (req, res: Response) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: 'Email requerido' });
        return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        const resetToken = Math.random().toString(36).substring(2, 15);
        console.log(`\n🔐 Password reset token for ${email}: ${resetToken}\n`);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'Si el email existe, recibirás un enlace de recuperación.' });
});

// ─── Get current user info ──────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        let playerData = null;
        let clubData = null;

        if (user.role === UserRole.PLAYER) {
            playerData = await prisma.player.findUnique({
                where: { userId: user.id },
                include: { locality: true, currentCategory: true },
            });
        } else if (user.role === UserRole.CLUB) {
            clubData = await prisma.club.findUnique({
                where: { userId: user.id },
                include: { locality: true },
            });
        }

        res.json({ user, player: playerData, club: clubData });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

export default router;
