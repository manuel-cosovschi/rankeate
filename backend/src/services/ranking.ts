import prisma from '../prisma';
import { BEST_N_RESULTS, ROLLING_MONTHS } from './points';

interface RankingEntry {
    rank: number;
    playerId: number;
    firstName: string;
    lastName: string;
    totalPoints: number;
    localityName: string;
    categoryName: string;
}

interface RankingOptions {
    localityId?: number;
    categoryId?: number;
    page: number;
    limit: number;
}

export async function getRankings(options: RankingOptions): Promise<{ data: RankingEntry[]; total: number; page: number; limit: number }> {
    const { localityId, categoryId, page = 1, limit = 20 } = options;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - ROLLING_MONTHS);

    // Build player filter
    const playerWhere: any = {};
    if (localityId) playerWhere.localityId = localityId;
    if (categoryId) playerWhere.currentCategoryId = categoryId;

    // Get all players matching filters
    const players = await prisma.player.findMany({
        where: playerWhere,
        include: {
            locality: true,
            currentCategory: true,
            pointMovements: {
                where: {
                    voidedAt: null,
                    createdAt: { gte: cutoffDate },
                },
                orderBy: { points: 'desc' },
            },
        },
    });

    // Calculate ranking: best N results from rolling window
    const ranked = players
        .map((player) => {
            const bestMovements = player.pointMovements.slice(0, BEST_N_RESULTS);
            const totalPoints = bestMovements.reduce((sum, m) => sum + m.points, 0);

            return {
                playerId: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
                totalPoints,
                localityName: player.locality.name,
                categoryName: player.currentCategory.name,
            };
        })
        .filter((p) => p.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints);

    const total = ranked.length;
    const offset = (page - 1) * limit;
    const paged = ranked.slice(offset, offset + limit).map((entry, idx) => ({
        ...entry,
        rank: offset + idx + 1,
    }));

    return { data: paged, total, page, limit };
}

export async function getPlayerRankingPosition(playerId: number): Promise<number | null> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - ROLLING_MONTHS);

    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { locality: true, currentCategory: true },
    });
    if (!player) return null;

    // Get all players in same locality + category
    const allPlayers = await prisma.player.findMany({
        where: {
            localityId: player.localityId,
            currentCategoryId: player.currentCategoryId,
        },
        include: {
            pointMovements: {
                where: {
                    voidedAt: null,
                    createdAt: { gte: cutoffDate },
                },
                orderBy: { points: 'desc' },
            },
        },
    });

    const ranked = allPlayers
        .map((p) => {
            const best = p.pointMovements.slice(0, BEST_N_RESULTS);
            return { playerId: p.id, totalPoints: best.reduce((s, m) => s + m.points, 0) };
        })
        .filter((p) => p.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints);

    const idx = ranked.findIndex((r) => r.playerId === playerId);
    return idx >= 0 ? idx + 1 : null;
}
