import { PrismaClient, UserRole, ClubStatus, TournamentLevel, TournamentStatus, ResultStatus, FinishPosition, Handedness, PreferredSide } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ─── Categories ────────────────────────────────────
    const categories = await Promise.all([
        prisma.category.upsert({ where: { name: '1ra' }, update: {}, create: { name: '1ra', sortOrder: 1 } }),
        prisma.category.upsert({ where: { name: '2da' }, update: {}, create: { name: '2da', sortOrder: 2 } }),
        prisma.category.upsert({ where: { name: '3ra' }, update: {}, create: { name: '3ra', sortOrder: 3 } }),
        prisma.category.upsert({ where: { name: '4ta' }, update: {}, create: { name: '4ta', sortOrder: 4 } }),
        prisma.category.upsert({ where: { name: '5ta' }, update: {}, create: { name: '5ta', sortOrder: 5 } }),
        prisma.category.upsert({ where: { name: '6ta' }, update: {}, create: { name: '6ta', sortOrder: 6 } }),
    ]);

    // ─── Localities ────────────────────────────────────
    const localities = await Promise.all([
        prisma.locality.upsert({ where: { name: 'Buenos Aires' }, update: {}, create: { name: 'Buenos Aires', province: 'Buenos Aires' } }),
        prisma.locality.upsert({ where: { name: 'Córdoba' }, update: {}, create: { name: 'Córdoba', province: 'Córdoba' } }),
        prisma.locality.upsert({ where: { name: 'Rosario' }, update: {}, create: { name: 'Rosario', province: 'Santa Fe' } }),
        prisma.locality.upsert({ where: { name: 'Mendoza' }, update: {}, create: { name: 'Mendoza', province: 'Mendoza' } }),
        prisma.locality.upsert({ where: { name: 'La Plata' }, update: {}, create: { name: 'La Plata', province: 'Buenos Aires' } }),
    ]);

    const hash = await bcrypt.hash('Admin123!', 12);

    // ─── Admin User ────────────────────────────────────
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@rankeate.com' },
        update: {},
        create: {
            email: 'admin@rankeate.com',
            passwordHash: hash,
            role: UserRole.ADMIN,
        },
    });

    // ─── Club User + Club ──────────────────────────────
    const clubHash = await bcrypt.hash('Club123!', 12);
    const clubUser = await prisma.user.upsert({
        where: { email: 'club@rankeate.com' },
        update: {},
        create: {
            email: 'club@rankeate.com',
            passwordHash: clubHash,
            role: UserRole.CLUB,
        },
    });

    const club = await prisma.club.upsert({
        where: { userId: clubUser.id },
        update: {},
        create: {
            userId: clubUser.id,
            name: 'Club Palermo Padel',
            localityId: localities[0].id,
            address: 'Av. del Libertador 4567, CABA',
            email: 'club@rankeate.com',
            phone: '011-4567-8901',
            managerName: 'Carlos López',
            managerDni: '25000001',
            status: ClubStatus.APPROVED,
        },
    });

    // ─── Player Users ─────────────────────────────────
    const playerHash = await bcrypt.hash('Player123!', 12);

    const playerNames = [
        { first: 'Martín', last: 'González', dni: '30000001', email: 'martin@rankeate.com', hasUser: true },
        { first: 'Lucía', last: 'Fernández', dni: '30000002', email: 'lucia@rankeate.com', hasUser: true },
        { first: 'Santiago', last: 'Rodríguez', dni: '30000003', email: 'santiago@rankeate.com', hasUser: true },
        { first: 'Valentina', last: 'López', dni: '30000004', email: null, hasUser: false },
        { first: 'Mateo', last: 'Martínez', dni: '30000005', email: null, hasUser: false },
        { first: 'Camila', last: 'García', dni: '30000006', email: null, hasUser: false },
        { first: 'Nicolás', last: 'Pérez', dni: '30000007', email: null, hasUser: false },
        { first: 'Isabella', last: 'Sánchez', dni: '30000008', email: null, hasUser: false },
        { first: 'Benjamín', last: 'Ramírez', dni: '30000009', email: null, hasUser: false },
        { first: 'Sofía', last: 'Torres', dni: '30000010', email: null, hasUser: false },
    ];

    const players: any[] = [];

    for (let i = 0; i < playerNames.length; i++) {
        const p = playerNames[i];
        let userId: number | undefined;

        if (p.hasUser && p.email) {
            const user = await prisma.user.upsert({
                where: { email: p.email },
                update: {},
                create: {
                    email: p.email,
                    passwordHash: playerHash,
                    role: UserRole.PLAYER,
                },
            });
            userId = user.id;
        }

        const localityIdx = i % localities.length;
        const categoryIdx = i % categories.length;

        const player = await prisma.player.upsert({
            where: { dni: p.dni },
            update: {},
            create: {
                userId: userId ?? null,
                dni: p.dni,
                firstName: p.first,
                lastName: p.last,
                birthDate: new Date(1990 + (i % 15), i % 12, (i * 3 % 28) + 1),
                handedness: i % 3 === 0 ? Handedness.LEFT : Handedness.RIGHT,
                preferredSide: i % 2 === 0 ? PreferredSide.DRIVE : PreferredSide.REVES,
                localityId: localities[localityIdx].id,
                currentCategoryId: categories[categoryIdx].id,
            },
        });
        players.push(player);
    }

    // ─── Sample Tournament 1 ──────────────────────────
    const tournament1 = await prisma.tournament.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            clubId: club.id,
            name: 'Abierto Palermo 2025',
            localityId: localities[0].id,
            level: TournamentLevel.REGIONAL_500,
            startDate: new Date('2025-11-15'),
            endDate: new Date('2025-11-17'),
            surface: 'Cemento',
            status: TournamentStatus.CONFIRMED,
        },
    });

    await prisma.tournamentCategory.upsert({
        where: { tournamentId_categoryId: { tournamentId: tournament1.id, categoryId: categories[0].id } },
        update: {},
        create: { tournamentId: tournament1.id, categoryId: categories[0].id },
    });

    const result1 = await prisma.tournamentResult.upsert({
        where: { tournamentId_categoryId: { tournamentId: tournament1.id, categoryId: categories[0].id } },
        update: {},
        create: {
            tournamentId: tournament1.id,
            categoryId: categories[0].id,
            status: ResultStatus.CONFIRMED,
            confirmedAt: new Date('2025-11-17'),
            confirmedBy: clubUser.id,
        },
    });

    // Result entries for tournament 1
    const t1placements: { playerIdx: number; pos: FinishPosition; pts: number }[] = [
        { playerIdx: 0, pos: FinishPosition.CHAMPION, pts: 500 },
        { playerIdx: 1, pos: FinishPosition.FINALIST, pts: 300 },
        { playerIdx: 2, pos: FinishPosition.SEMIFINALIST, pts: 180 },
        { playerIdx: 3, pos: FinishPosition.SEMIFINALIST, pts: 180 },
        { playerIdx: 4, pos: FinishPosition.QUARTERFINALIST, pts: 90 },
        { playerIdx: 5, pos: FinishPosition.QUARTERFINALIST, pts: 90 },
        { playerIdx: 6, pos: FinishPosition.PARTICIPANT, pts: 10 },
        { playerIdx: 7, pos: FinishPosition.PARTICIPANT, pts: 10 },
    ];

    for (const pl of t1placements) {
        await prisma.tournamentResultEntry.upsert({
            where: { resultId_playerId: { resultId: result1.id, playerId: players[pl.playerIdx].id } },
            update: {},
            create: {
                resultId: result1.id,
                playerId: players[pl.playerIdx].id,
                finishPosition: pl.pos,
            },
        });

        await prisma.pointMovement.create({
            data: {
                playerId: players[pl.playerIdx].id,
                tournamentId: tournament1.id,
                categoryId: categories[0].id,
                points: pl.pts,
                reason: `${pl.pos} - Abierto Palermo 2025 (1ra)`,
                createdByUserId: clubUser.id,
            },
        }).catch(() => { }); // skip if duplicate on re-seed
    }

    // ─── Sample Tournament 2 ──────────────────────────
    const tournament2 = await prisma.tournament.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            clubId: club.id,
            name: 'Copa La Plata 2025',
            localityId: localities[4].id,
            level: TournamentLevel.LOCAL_250,
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-02'),
            surface: 'Sintético',
            status: TournamentStatus.CONFIRMED,
        },
    });

    await prisma.tournamentCategory.upsert({
        where: { tournamentId_categoryId: { tournamentId: tournament2.id, categoryId: categories[2].id } },
        update: {},
        create: { tournamentId: tournament2.id, categoryId: categories[2].id },
    });

    const result2 = await prisma.tournamentResult.upsert({
        where: { tournamentId_categoryId: { tournamentId: tournament2.id, categoryId: categories[2].id } },
        update: {},
        create: {
            tournamentId: tournament2.id,
            categoryId: categories[2].id,
            status: ResultStatus.CONFIRMED,
            confirmedAt: new Date('2025-12-02'),
            confirmedBy: clubUser.id,
        },
    });

    const t2placements: { playerIdx: number; pos: FinishPosition; pts: number }[] = [
        { playerIdx: 2, pos: FinishPosition.CHAMPION, pts: 250 },
        { playerIdx: 5, pos: FinishPosition.FINALIST, pts: 150 },
        { playerIdx: 8, pos: FinishPosition.SEMIFINALIST, pts: 90 },
        { playerIdx: 9, pos: FinishPosition.SEMIFINALIST, pts: 90 },
        { playerIdx: 0, pos: FinishPosition.PARTICIPANT, pts: 5 },
        { playerIdx: 1, pos: FinishPosition.PARTICIPANT, pts: 5 },
    ];

    for (const pl of t2placements) {
        await prisma.tournamentResultEntry.upsert({
            where: { resultId_playerId: { resultId: result2.id, playerId: players[pl.playerIdx].id } },
            update: {},
            create: {
                resultId: result2.id,
                playerId: players[pl.playerIdx].id,
                finishPosition: pl.pos,
            },
        });

        await prisma.pointMovement.create({
            data: {
                playerId: players[pl.playerIdx].id,
                tournamentId: tournament2.id,
                categoryId: categories[2].id,
                points: pl.pts,
                reason: `${pl.pos} - Copa La Plata 2025 (3ra)`,
                createdByUserId: clubUser.id,
            },
        }).catch(() => { });
    }

    // ─── Audit entries ────────────────────────────────
    await prisma.auditLog.create({
        data: {
            actorUserId: adminUser.id,
            action: 'SEED',
            entityType: 'system',
            entityId: 0,
            payload: JSON.stringify({ message: 'Database seeded successfully' }),
        },
    }).catch(() => { });

    console.log('✅ Seed complete!');
    console.log('');
    console.log('📋 Credentials:');
    console.log('   Admin:  admin@rankeate.com / Admin123!');
    console.log('   Club:   club@rankeate.com / Club123!');
    console.log('   Player: martin@rankeate.com / Player123!');
    console.log('   Player: lucia@rankeate.com / Player123!');
    console.log('   Player: santiago@rankeate.com / Player123!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
