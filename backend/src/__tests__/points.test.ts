import { calculatePoints, getPointsTable, BEST_N_RESULTS, ROLLING_MONTHS } from '../services/points';

describe('Points Calculation', () => {
    describe('getPointsTable', () => {
        it('should define point tables for all tournament levels', () => {
            const table = getPointsTable();
            expect(table).toHaveProperty('LOCAL_250');
            expect(table).toHaveProperty('REGIONAL_500');
            expect(table).toHaveProperty('OPEN_1000');
        });
    });

    describe('calculatePoints', () => {
        it('should award correct points for LOCAL_250', () => {
            expect(calculatePoints('LOCAL_250' as any, 'CHAMPION' as any)).toBe(250);
            expect(calculatePoints('LOCAL_250' as any, 'FINALIST' as any)).toBe(150);
            expect(calculatePoints('LOCAL_250' as any, 'SEMIFINALIST' as any)).toBe(90);
            expect(calculatePoints('LOCAL_250' as any, 'QUARTERFINALIST' as any)).toBe(45);
            expect(calculatePoints('LOCAL_250' as any, 'ROUND_OF_16' as any)).toBe(20);
            expect(calculatePoints('LOCAL_250' as any, 'PARTICIPANT' as any)).toBe(5);
        });

        it('should award correct points for REGIONAL_500', () => {
            expect(calculatePoints('REGIONAL_500' as any, 'CHAMPION' as any)).toBe(500);
            expect(calculatePoints('REGIONAL_500' as any, 'FINALIST' as any)).toBe(300);
            expect(calculatePoints('REGIONAL_500' as any, 'SEMIFINALIST' as any)).toBe(180);
            expect(calculatePoints('REGIONAL_500' as any, 'QUARTERFINALIST' as any)).toBe(90);
            expect(calculatePoints('REGIONAL_500' as any, 'ROUND_OF_16' as any)).toBe(45);
            expect(calculatePoints('REGIONAL_500' as any, 'PARTICIPANT' as any)).toBe(10);
        });

        it('should award correct points for OPEN_1000', () => {
            expect(calculatePoints('OPEN_1000' as any, 'CHAMPION' as any)).toBe(1000);
            expect(calculatePoints('OPEN_1000' as any, 'FINALIST' as any)).toBe(600);
            expect(calculatePoints('OPEN_1000' as any, 'SEMIFINALIST' as any)).toBe(360);
            expect(calculatePoints('OPEN_1000' as any, 'QUARTERFINALIST' as any)).toBe(180);
            expect(calculatePoints('OPEN_1000' as any, 'ROUND_OF_16' as any)).toBe(90);
            expect(calculatePoints('OPEN_1000' as any, 'PARTICIPANT' as any)).toBe(25);
        });

        it('should return 0 for unknown level', () => {
            expect(calculatePoints('UNKNOWN' as any, 'CHAMPION' as any)).toBe(0);
        });

        it('should return 0 for unknown position', () => {
            expect(calculatePoints('LOCAL_250' as any, 'UNKNOWN' as any)).toBe(0);
        });
    });

    describe('Constants', () => {
        it('should use best 8 results', () => {
            expect(BEST_N_RESULTS).toBe(8);
        });

        it('should use 12-month rolling window', () => {
            expect(ROLLING_MONTHS).toBe(12);
        });
    });
});

describe('Ranking Calculation Logic', () => {
    it('should use best 8 results from rolling 12-month window', () => {
        const results = [500, 300, 250, 180, 150, 90, 90, 45, 20, 5];
        const sorted = results.sort((a, b) => b - a);
        const best8 = sorted.slice(0, BEST_N_RESULTS);
        const total = best8.reduce((sum, r) => sum + r, 0);

        // Best 8: 500+300+250+180+150+90+90+45 = 1605
        expect(total).toBe(1605);
        expect(best8.length).toBe(8);
    });

    it('should handle fewer than 8 results', () => {
        const results = [250, 150];
        const best8 = results.slice(0, BEST_N_RESULTS);
        const total = best8.reduce((sum, r) => sum + r, 0);

        expect(total).toBe(400);
        expect(best8.length).toBe(2);
    });

    it('should exclude results older than 12 months', () => {
        const now = new Date();
        const thirteenMonthsAgo = new Date(now);
        thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

        const results = [
            { points: 500, date: now },
            { points: 1000, date: thirteenMonthsAgo },
        ];

        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - ROLLING_MONTHS);

        const filtered = results.filter(r => r.date >= cutoff);
        const total = filtered.reduce((sum, r) => sum + r.points, 0);

        expect(total).toBe(500);
        expect(filtered.length).toBe(1);
    });
});
