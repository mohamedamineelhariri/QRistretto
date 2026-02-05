import prisma from '../config/database.js';

/**
 * Get menu items for a restaurant, grouped by category
 */
export async function getMenuByRestaurant(restaurantId, locale = 'en') {
    const items = await prisma.menuItem.findMany({
        where: {
            restaurantId,
            available: true,
        },
        orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' },
        ],
    });

    // Group by category
    const grouped = {};

    items.forEach(item => {
        // Get localized category name
        let categoryName = item.category;
        if (locale === 'fr' && item.categoryFr) categoryName = item.categoryFr;
        if (locale === 'ar' && item.categoryAr) categoryName = item.categoryAr;

        if (!grouped[categoryName]) {
            grouped[categoryName] = {
                category: categoryName,
                categoryEn: item.category,
                categoryFr: item.categoryFr,
                categoryAr: item.categoryAr,
                items: [],
            };
        }

        // Get localized item name and description
        let name = item.name;
        let description = item.description;

        if (locale === 'fr') {
            name = item.nameFr || item.name;
            description = item.descriptionFr || item.description;
        } else if (locale === 'ar') {
            name = item.nameAr || item.name;
            description = item.descriptionAr || item.description;
        }

        grouped[categoryName].items.push({
            id: item.id,
            name,
            nameEn: item.name,
            nameFr: item.nameFr,
            nameAr: item.nameAr,
            description,
            descriptionEn: item.description,
            descriptionFr: item.descriptionFr,
            descriptionAr: item.descriptionAr,
            price: parseFloat(item.price),
            imageUrl: item.imageUrl,
            available: item.available,
        });
    });

    return Object.values(grouped);
}

/**
 * Get all menu items for admin (including unavailable)
 */
export async function getAllMenuItems(restaurantId) {
    return prisma.menuItem.findMany({
        where: { restaurantId },
        orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
        ],
    });
}

/**
 * Create a new menu item
 */
export async function createMenuItem(restaurantId, data) {
    return prisma.menuItem.create({
        data: {
            restaurantId,
            name: data.name,
            nameFr: data.nameFr,
            nameAr: data.nameAr,
            description: data.description,
            descriptionFr: data.descriptionFr,
            descriptionAr: data.descriptionAr,
            category: data.category,
            categoryFr: data.categoryFr,
            categoryAr: data.categoryAr,
            price: data.price,
            imageUrl: data.imageUrl,
            available: data.available ?? true,
            sortOrder: data.sortOrder ?? 0,
        },
    });
}

/**
 * Update a menu item
 */
export async function updateMenuItem(itemId, restaurantId, data) {
    // Verify item belongs to restaurant
    const item = await prisma.menuItem.findFirst({
        where: { id: itemId, restaurantId },
    });

    if (!item) {
        throw new Error('Menu item not found');
    }

    return prisma.menuItem.update({
        where: { id: itemId },
        data: {
            name: data.name,
            nameFr: data.nameFr,
            nameAr: data.nameAr,
            description: data.description,
            descriptionFr: data.descriptionFr,
            descriptionAr: data.descriptionAr,
            category: data.category,
            categoryFr: data.categoryFr,
            categoryAr: data.categoryAr,
            price: data.price,
            imageUrl: data.imageUrl,
            available: data.available,
            sortOrder: data.sortOrder,
        },
    });
}

/**
 * Toggle menu item availability
 */
export async function toggleItemAvailability(itemId, restaurantId) {
    const item = await prisma.menuItem.findFirst({
        where: { id: itemId, restaurantId },
    });

    if (!item) {
        throw new Error('Menu item not found');
    }

    return prisma.menuItem.update({
        where: { id: itemId },
        data: { available: !item.available },
    });
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(itemId, restaurantId) {
    const item = await prisma.menuItem.findFirst({
        where: { id: itemId, restaurantId },
    });

    if (!item) {
        throw new Error('Menu item not found');
    }

    return prisma.menuItem.delete({
        where: { id: itemId },
    });
}

/**
 * Get unique categories for a restaurant
 */
export async function getCategories(restaurantId) {
    const items = await prisma.menuItem.findMany({
        where: { restaurantId },
        select: {
            category: true,
            categoryFr: true,
            categoryAr: true,
        },
        distinct: ['category'],
    });

    return items;
}
