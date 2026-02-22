import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
    user?: {
        userId: number;
        role: string;
    };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token no proporcionado' });
        return;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

export function roleMiddleware(...roles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'No autenticado' });
            return;
        }
        if (!roles.includes(req.user.role as UserRole)) {
            res.status(403).json({ error: 'No tiene permisos para esta acción' });
            return;
        }
        next();
    };
}
