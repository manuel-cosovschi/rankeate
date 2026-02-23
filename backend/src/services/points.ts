import { FinishPosition } from '@prisma/client';

/**
 * Standard Points table by finish position
 */
const POINTS_TABLE: Record<FinishPosition, number> = {
    [FinishPosition.CHAMPION]: 250,
    [FinishPosition.FINALIST]: 150,
    [FinishPosition.SEMIFINALIST]: 90,
    [FinishPosition.QUARTERFINALIST]: 45,
    [FinishPosition.ROUND_OF_16]: 20,
    [FinishPosition.PARTICIPANT]: 5,
};

export function calculatePoints(position: FinishPosition): number {
    return POINTS_TABLE[position] ?? 0;
}

export function getPointsTable() {
    return POINTS_TABLE;
}

/**
 * Best N results from rolling 12-month window
 */
export const BEST_N_RESULTS = 8;
export const ROLLING_MONTHS = 12;
