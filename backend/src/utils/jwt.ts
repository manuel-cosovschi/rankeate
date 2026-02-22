import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
    userId: number;
    role: string;
}

export function signAccessToken(payload: TokenPayload): string {
    const options: SignOptions = { expiresIn: 900 }; // 15 minutes in seconds
    return jwt.sign({ ...payload }, config.jwtSecret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = { expiresIn: 604800 }; // 7 days in seconds
    return jwt.sign({ ...payload }, config.jwtRefreshSecret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}
