import { FinishPosition, TournamentLevel } from '@prisma/client';

/**
 * Points table by tournament level and finish position
 */
const POINTS_TABLE: Record<TournamentLevel, Record<FinishPosition, number>> = {
    [TournamentLevel.LOCAL_250]: {
        [FinishPosition.CHAMPION]: 250,
        [FinishPosition.FINALIST]: 150,
        [FinishPosition.SEMIFINALIST]: 90,
        [FinishPosition.QUARTERFINALIST]: 45,
        [FinishPosition.ROUND_OF_16]: 20,
        [FinishPosition.PARTICIPANT]: 5,
    },
    [TournamentLevel.REGIONAL_500]: {
        [FinishPosition.CHAMPION]: 500,
        [FinishPosition.FINALIST]: 300,
        [FinishPosition.SEMIFINALIST]: 180,
        [FinishPosition.QUARTERFINALIST]: 90,
        [FinishPosition.ROUND_OF_16]: 45,
        [FinishPosition.PARTICIPANT]: 10,
    },
    [TournamentLevel.OPEN_1000]: {
        [FinishPosition.CHAMPION]: 1000,
        [FinishPosition.FINALIST]: 600,
        [FinishPosition.SEMIFINALIST]: 360,
        [FinishPosition.QUARTERFINALIST]: 180,
        [FinishPosition.ROUND_OF_16]: 90,
        [FinishPosition.PARTICIPANT]: 25,
    },
};

export function calculatePoints(level: TournamentLevel, position: FinishPosition): number {
    return POINTS_TABLE[level]?.[position] ?? 0;
}

export function getPointsTable() {
    return POINTS_TABLE;
}

/**
 * Best N results from rolling 12-month window
 */
export const BEST_N_RESULTS = 8;
export const ROLLING_MONTHS = 12;
