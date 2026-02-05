import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const restaurant = await prisma.restaurant.findFirst();
    if (!restaurant) {
        console.error('❌ No restaurant found in database.');
        return;
    }

    const existing = await prisma.wifiNetwork.findFirst({
        where: {
            restaurantId: restaurant.id,
            networkName: 'Hotspot',
        }
    });

    if (existing) {
        await prisma.wifiNetwork.update({
            where: { id: existing.id },
            data: { ipRange: '192.168.137.0/24' }
        });
        console.log('✅ Updated existing Hotspot network with range 192.168.137.0/24');
    } else {
        await prisma.wifiNetwork.create({
            data: {
                restaurantId: restaurant.id,
                networkName: 'Hotspot',
                ipRange: '192.168.137.0/24',
                networkType: 'main',
            }
        });
        console.log('✅ Created new Hotspot network with range 192.168.137.0/24');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
