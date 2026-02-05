import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const query = '19095370';
    console.log(`Searching for "${query}"...`);

    const results = await Promise.all([
        prisma.restaurant.findMany({ where: { OR: [{ id: { contains: query } }, { name: { contains: query } }] } }),
        prisma.table.findMany({ where: { OR: [{ id: { contains: query } }, { tableName: { contains: query } }] } }),
        prisma.qRToken.findMany({ where: { OR: [{ id: { contains: query } }, { token: { contains: query } }] } }),
        prisma.menuItem.findMany({ where: { OR: [{ id: { contains: query } }, { name: { contains: query } }] } }),
        prisma.order.findMany({ where: { OR: [{ id: { contains: query } }] } }),
    ]);

    console.log('Results:', JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
