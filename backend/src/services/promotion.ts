import prisma from '../prisma';
import { BEST_N_RESULTS, ROLLING_MONTHS } from './points';

/**
 * Category promotion thresholds (based on accumulated ranking points).
 * Categories go from 8va (lowest, sortOrder=8) to 1ra (highest, sortOrder=1).
 * To ASCEND (e.g. 8va → 7ma), a player must accumulate X points.
 * Thresholds increase exponentially as categories get higher.
 * 
 * Key: current category sortOrder → points needed to promote to next category
 */
const PROMOTION_THRESHOLDS: Record<number, number> = {
    8: 300,    // 8va → 7ma: 300 pts (easiest)
    7: 600,    // 7ma → 6ta: 600 pts
    6: 1200,   // 6ta → 5ta: 1200 pts
    5: 2000,   // 5ta → 4ta: 2000 pts
    4: 3500,   // 4ta → 3ra: 3500 pts
    3: 5500,   // 3ra → 2da: 5500 pts
    2: 8000,   // 2da → 1ra: 8000 pts (hardest)
    // 1: no promotion beyond 1ra
};

export interface PromotionResult {
    playerId: number;
    playerName: string;
    fromCategory: string;
    toCategory: string;
    totalPoints: number;
    threshold: number;
}

/**
 * Calculate a player's current ranking points (best N from rolling window)
 */
async function getPlayerRankingPoints(playerId: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - ROLLING_MONTHS);

    const movements = await prisma.pointMovement.findMany({
        where: {
            playerId,
            voidedAt: null,
            createdAt: { gte: cutoffDate },
        },
        orderBy: { points: 'desc' },
        take: BEST_N_RESULTS,
    });

    return movements.reduce((sum, m) => sum + m.points, 0);
}

/**
 * Check and apply category promotion for a single player.
 * Returns promotion details if promoted, null otherwise.
 */
export async function checkAndPromotePlayer(playerId: number): Promise<PromotionResult | null> {
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { currentCategory: true },
    });

    if (!player) return null;

    const currentSortOrder = player.currentCategory.sortOrder;

    // Already at highest category (1ra)
    if (currentSortOrder <= 1) return null;

    const threshold = PROMOTION_THRESHOLDS[currentSortOrder];
    if (!threshold) return null;

    const totalPoints = await getPlayerRankingPoints(playerId);

    if (totalPoints >= threshold) {
        // Find the next category (lower sortOrder = higher category)
        const nextCategory = await prisma.category.findFirst({
            where: { sortOrder: currentSortOrder - 1 },
        });

        if (!nextCategory) return null;

        // Promote the player
        await prisma.player.update({
            where: { id: playerId },
            data: { currentCategoryId: nextCategory.id },
        });

        return {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            fromCategory: player.currentCategory.name,
            toCategory: nextCategory.name,
            totalPoints,
            threshold,
        };
    }

    return null;
}

/**
 * Check promotions for multiple players (called after confirming tournament results)
 */
export async function checkPromotionsForPlayers(playerIds: number[]): Promise<PromotionResult[]> {
    const promotions: PromotionResult[] = [];

    for (const playerId of playerIds) {
        const result = await checkAndPromotePlayer(playerId);
        if (result) {
            promotions.push(result);
        }
    }

    return promotions;
}

/**
 * Get the promotion threshold for a player's current category
 */
export function getPromotionThreshold(sortOrder: number): number | null {
    return PROMOTION_THRESHOLDS[sortOrder] ?? null;
}

export { PROMOTION_THRESHOLDS };
