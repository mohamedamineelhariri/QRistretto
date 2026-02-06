import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all bundles for a restaurant
 */
export async function getAllBundles(restaurantId) {
    return prisma.bundle.findMany({
        where: { restaurantId },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            id: true,
                            name: true,
                            nameFr: true,
                            nameAr: true,
                            price: true,
                            imageUrl: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * Get single bundle
 */
export async function getBundle(id, restaurantId) {
    return prisma.bundle.findFirst({
        where: { id, restaurantId },
        include: {
            items: {
                include: {
                    menuItem: true
                }
            }
        }
    });
}

/**
 * Create new bundle
 */
export async function createBundle(restaurantId, data) {
    const { items, ...bundleData } = data;

    // Validate that all menu items exist and belong to this restaurant
    if (items && items.length > 0) {
        const menuItemIds = items.map(item => item.menuItemId);
        const menuItems = await prisma.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                restaurantId
            }
        });

        if (menuItems.length !== menuItemIds.length) {
            throw new Error('Some menu items not found or do not belong to this restaurant');
        }
    }

    return prisma.bundle.create({
        data: {
            ...bundleData,
            restaurantId,
            items: items ? {
                create: items.map(item => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity || 1
                }))
            } : undefined
        },
        include: {
            items: {
                include: {
                    menuItem: true
                }
            }
        }
    });
}

/**
 * Update bundle
 */
export async function updateBundle(id, restaurantId, data) {
    const bundle = await prisma.bundle.findFirst({
        where: { id, restaurantId }
    });

    if (!bundle) {
        throw new Error('Bundle not found');
    }

    const { items, ...bundleData } = data;

    // If items are being updated, validate them
    if (items) {
        const menuItemIds = items.map(item => item.menuItemId);
        const menuItems = await prisma.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                restaurantId
            }
        });

        if (menuItems.length !== menuItemIds.length) {
            throw new Error('Some menu items not found');
        }

        // Delete existing items and create new ones
        await prisma.bundleItem.deleteMany({
            where: { bundleId: id }
        });
    }

    return prisma.bundle.update({
        where: { id },
        data: {
            ...bundleData,
            items: items ? {
                create: items.map(item => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity || 1
                }))
            } : undefined
        },
        include: {
            items: {
                include: {
                    menuItem: true
                }
            }
        }
    });
}

/**
 * Delete bundle
 */
export async function deleteBundle(id, restaurantId) {
    const bundle = await prisma.bundle.findFirst({
        where: { id, restaurantId }
    });

    if (!bundle) {
        throw new Error('Bundle not found');
    }

    return prisma.bundle.delete({
        where: { id }
    });
}

/**
 * Toggle bundle availability
 */
export async function toggleBundleAvailability(id, restaurantId) {
    const bundle = await prisma.bundle.findFirst({
        where: { id, restaurantId }
    });

    if (!bundle) {
        throw new Error('Bundle not found');
    }

    return prisma.bundle.update({
        where: { id },
        data: {
            available: !bundle.available
        }
    });
}
