import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');

    // Create demo restaurant
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const restaurant = await prisma.restaurant.upsert({
        where: { adminEmail: 'admin@cafedemo.ma' },
        update: {},
        create: {
            name: 'Café Demo',
            nameFr: 'Café Démo',
            nameAr: 'مقهى ديمو',
            adminEmail: 'admin@cafedemo.ma',
            adminPassword: hashedPassword,
            isActive: true,
        },
    });

    console.log(`✅ Restaurant: ${restaurant.name}`);

    // Add WiFi networks
    await prisma.wifiNetwork.deleteMany({ where: { restaurantId: restaurant.id } });

    const networks = await prisma.wifiNetwork.createMany({
        data: [
            { restaurantId: restaurant.id, networkName: 'CafeDemo_5G', ipRange: '192.168.1.0/24', networkType: '5G' },
            { restaurantId: restaurant.id, networkName: 'CafeDemo_2.4G', ipRange: '192.168.2.0/24', networkType: '2.4G' },
            { restaurantId: restaurant.id, networkName: 'CafeDemo_Guest', ipRange: '10.0.0.0/24', networkType: 'guest' },
        ],
    });

    console.log(`✅ WiFi Networks: ${networks.count} created`);

    // Create tables
    await prisma.table.deleteMany({ where: { restaurantId: restaurant.id } });

    const tables = await prisma.table.createMany({
        data: [
            { restaurantId: restaurant.id, tableNumber: 1, tableName: 'Window 1', capacity: 2 },
            { restaurantId: restaurant.id, tableNumber: 2, tableName: 'Window 2', capacity: 2 },
            { restaurantId: restaurant.id, tableNumber: 3, capacity: 4 },
            { restaurantId: restaurant.id, tableNumber: 4, capacity: 4 },
            { restaurantId: restaurant.id, tableNumber: 5, tableName: 'Terrace 1', capacity: 4 },
            { restaurantId: restaurant.id, tableNumber: 6, tableName: 'Terrace 2', capacity: 6 },
            { restaurantId: restaurant.id, tableNumber: 7, tableName: 'VIP', capacity: 8 },
        ],
    });

    console.log(`✅ Tables: ${tables.count} created`);

    // Create staff
    await prisma.staff.deleteMany({ where: { restaurantId: restaurant.id } });

    const waiterPin = await bcrypt.hash('1234', 10);
    const kitchenPin = await bcrypt.hash('5678', 10);

    await prisma.staff.createMany({
        data: [
            { restaurantId: restaurant.id, name: 'Ahmed', pin: waiterPin, role: 'WAITER' },
            { restaurantId: restaurant.id, name: 'Fatima', pin: waiterPin, role: 'WAITER' },
            { restaurantId: restaurant.id, name: 'Youssef', pin: kitchenPin, role: 'KITCHEN' },
        ],
    });

    console.log(`✅ Staff: 3 created (Waiter PIN: 1234, Kitchen PIN: 5678)`);

    // Create menu items
    await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });

    const menuItems = await prisma.menuItem.createMany({
        data: [
            // Hot Drinks
            {
                restaurantId: restaurant.id,
                name: 'Espresso',
                nameFr: 'Expresso',
                nameAr: 'إسبريسو',
                description: 'Strong Italian coffee',
                descriptionFr: 'Café italien fort',
                descriptionAr: 'قهوة إيطالية قوية',
                category: 'Hot Drinks',
                categoryFr: 'Boissons Chaudes',
                categoryAr: 'مشروبات ساخنة',
                price: 15,
                sortOrder: 1,
            },
            {
                restaurantId: restaurant.id,
                name: 'Cappuccino',
                nameFr: 'Cappuccino',
                nameAr: 'كابتشينو',
                description: 'Espresso with steamed milk foam',
                descriptionFr: 'Expresso avec mousse de lait',
                descriptionAr: 'إسبريسو مع رغوة الحليب',
                category: 'Hot Drinks',
                categoryFr: 'Boissons Chaudes',
                categoryAr: 'مشروبات ساخنة',
                price: 22,
                sortOrder: 2,
            },
            {
                restaurantId: restaurant.id,
                name: 'Moroccan Mint Tea',
                nameFr: 'Thé à la Menthe',
                nameAr: 'أتاي بالنعناع',
                description: 'Traditional green tea with fresh mint',
                descriptionFr: 'Thé vert traditionnel à la menthe fraîche',
                descriptionAr: 'شاي أخضر تقليدي بالنعناع الطازج',
                category: 'Hot Drinks',
                categoryFr: 'Boissons Chaudes',
                categoryAr: 'مشروبات ساخنة',
                price: 18,
                sortOrder: 3,
            },
            {
                restaurantId: restaurant.id,
                name: 'Nous Nous',
                nameFr: 'Nous Nous',
                nameAr: 'نص نص',
                description: 'Half coffee, half milk - Moroccan style',
                descriptionFr: 'Moitié café, moitié lait - style marocain',
                descriptionAr: 'نصف قهوة، نصف حليب - على الطريقة المغربية',
                category: 'Hot Drinks',
                categoryFr: 'Boissons Chaudes',
                categoryAr: 'مشروبات ساخنة',
                price: 14,
                sortOrder: 4,
            },

            // Cold Drinks
            {
                restaurantId: restaurant.id,
                name: 'Fresh Orange Juice',
                nameFr: 'Jus d\'Orange Frais',
                nameAr: 'عصير برتقال طازج',
                category: 'Cold Drinks',
                categoryFr: 'Boissons Froides',
                categoryAr: 'مشروبات باردة',
                price: 20,
                sortOrder: 1,
            },
            {
                restaurantId: restaurant.id,
                name: 'Avocado Smoothie',
                nameFr: 'Smoothie Avocat',
                nameAr: 'سموذي الأفوكادو',
                category: 'Cold Drinks',
                categoryFr: 'Boissons Froides',
                categoryAr: 'مشروبات باردة',
                price: 30,
                sortOrder: 2,
            },
            {
                restaurantId: restaurant.id,
                name: 'Iced Latte',
                nameFr: 'Latte Glacé',
                nameAr: 'لاتيه مثلج',
                category: 'Cold Drinks',
                categoryFr: 'Boissons Froides',
                categoryAr: 'مشروبات باردة',
                price: 25,
                sortOrder: 3,
            },

            // Pastries
            {
                restaurantId: restaurant.id,
                name: 'Croissant',
                nameFr: 'Croissant',
                nameAr: 'كرواسون',
                description: 'Buttery French pastry',
                descriptionFr: 'Viennoiserie française au beurre',
                descriptionAr: 'معجنات فرنسية بالزبدة',
                category: 'Pastries',
                categoryFr: 'Pâtisseries',
                categoryAr: 'معجنات',
                price: 12,
                sortOrder: 1,
            },
            {
                restaurantId: restaurant.id,
                name: 'Pain au Chocolat',
                nameFr: 'Pain au Chocolat',
                nameAr: 'بان أو شوكولا',
                category: 'Pastries',
                categoryFr: 'Pâtisseries',
                categoryAr: 'معجنات',
                price: 15,
                sortOrder: 2,
            },
            {
                restaurantId: restaurant.id,
                name: 'Msemen',
                nameFr: 'Msemen',
                nameAr: 'مسمن',
                description: 'Traditional Moroccan flatbread',
                descriptionFr: 'Pain plat marocain traditionnel',
                descriptionAr: 'خبز مغربي تقليدي',
                category: 'Pastries',
                categoryFr: 'Pâtisseries',
                categoryAr: 'معجنات',
                price: 8,
                sortOrder: 3,
            },
            {
                restaurantId: restaurant.id,
                name: 'Baghrir',
                nameFr: 'Baghrir',
                nameAr: 'بغرير',
                description: 'Moroccan thousand-hole pancake',
                descriptionFr: 'Crêpe marocaine aux mille trous',
                descriptionAr: 'فطيرة مغربية بألف ثقب',
                category: 'Pastries',
                categoryFr: 'Pâtisseries',
                categoryAr: 'معجنات',
                price: 10,
                sortOrder: 4,
            },

            // Breakfast
            {
                restaurantId: restaurant.id,
                name: 'Moroccan Breakfast',
                nameFr: 'Petit Déjeuner Marocain',
                nameAr: 'فطور مغربي',
                description: 'Msemen, eggs, honey, olive oil, mint tea',
                descriptionFr: 'Msemen, œufs, miel, huile d\'olive, thé à la menthe',
                descriptionAr: 'مسمن، بيض، عسل، زيت زيتون، أتاي',
                category: 'Breakfast',
                categoryFr: 'Petit Déjeuner',
                categoryAr: 'فطور',
                price: 45,
                sortOrder: 1,
            },
            {
                restaurantId: restaurant.id,
                name: 'Continental Breakfast',
                nameFr: 'Petit Déjeuner Continental',
                nameAr: 'فطور قاري',
                description: 'Croissant, bread, butter, jam, coffee',
                descriptionFr: 'Croissant, pain, beurre, confiture, café',
                descriptionAr: 'كرواسون، خبز، زبدة، مربى، قهوة',
                category: 'Breakfast',
                categoryFr: 'Petit Déjeuner',
                categoryAr: 'فطور',
                price: 40,
                sortOrder: 2,
            },

            // Snacks
            {
                restaurantId: restaurant.id,
                name: 'Panini Chicken',
                nameFr: 'Panini Poulet',
                nameAr: 'بانيني دجاج',
                category: 'Snacks',
                categoryFr: 'Snacks',
                categoryAr: 'وجبات خفيفة',
                price: 35,
                sortOrder: 1,
            },
            {
                restaurantId: restaurant.id,
                name: 'Mixed Salad',
                nameFr: 'Salade Mixte',
                nameAr: 'سلطة مشكلة',
                category: 'Snacks',
                categoryFr: 'Snacks',
                categoryAr: 'وجبات خفيفة',
                price: 28,
                sortOrder: 2,
            },
        ],
    });

    console.log(`✅ Menu Items: ${menuItems.count} created`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Admin: admin@cafedemo.ma / admin123');
    console.log('   Waiter PIN: 1234');
    console.log('   Kitchen PIN: 5678');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
