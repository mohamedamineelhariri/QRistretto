import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all inventory items for a restaurant
 */
export async function getAllInventoryItems(restaurantId) {
    return prisma.inventoryItem.findMany({
        where: { restaurantId },
        orderBy: [
            { currentStock: 'asc' }, // Show low stock first
            { name: 'asc' }
        ]
    });
}

/**
 * Get single inventory item
 */
export async function getInventoryItem(id, restaurantId) {
    return prisma.inventoryItem.findFirst({
        where: { id, restaurantId }
    });
}

/**
 * Create new inventory item
 */
export async function createInventoryItem(restaurantId, data) {
    return prisma.inventoryItem.create({
        data: {
            ...data,
            restaurantId
        }
    });
}

/**
 * Update inventory item
 */
export async function updateInventoryItem(id, restaurantId, data) {
    const item = await prisma.inventoryItem.findFirst({
        where: { id, restaurantId }
    });

    if (!item) {
        throw new Error('Inventory item not found');
    }

    return prisma.inventoryItem.update({
        where: { id },
        data
    });
}

/**
 * Delete inventory item
 */
export async function deleteInventoryItem(id, restaurantId) {
    const item = await prisma.inventoryItem.findFirst({
        where: { id, restaurantId }
    });

    if (!item) {
        throw new Error('Inventory item not found');
    }

    // Check if item is used in recipes
    const recipeCount = await prisma.recipeItem.count({
        where: { inventoryItemId: id }
    });

    if (recipeCount > 0) {
        throw new Error('Cannot delete inventory item used in recipes');
    }

    return prisma.inventoryItem.delete({
        where: { id }
    });
}

/**
 * Get low stock items (below minimum threshold)
 */
export async function getLowStockItems(restaurantId) {
    return prisma.$queryRaw`
        SELECT * FROM inventory_items
        WHERE "restaurantId" = ${restaurantId}
        AND "currentStock" <= "minStock"
        ORDER BY ("currentStock" / NULLIF("minStock", 0)) ASC
    `;
}

/**
 * Deduct stock from inventory
 */
export async function deductStock(inventoryItemId, quantity) {
    const item = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId }
    });

    if (!item) {
        throw new Error('Inventory item not found');
    }

    const newStock = parseFloat(item.currentStock) - parseFloat(quantity);

    if (newStock < 0) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${item.currentStock}, Required: ${quantity}`);
    }

    return prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
            currentStock: newStock
        }
    });
}

/**
 * Add stock to inventory (restocking)
 */
export async function addStock(inventoryItemId, quantity, restaurantId) {
    const item = await prisma.inventoryItem.findFirst({
        where: { id: inventoryItemId, restaurantId }
    });

    if (!item) {
        throw new Error('Inventory item not found');
    }

    const newStock = parseFloat(item.currentStock) + parseFloat(quantity);

    return prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
            currentStock: newStock
        }
    });
}

/**
 * Deduct stock for an entire order
 */
export async function deductStockForOrder(orderId) {
    // Get order with items and their recipes
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    menuItem: {
                        include: {
                            recipeItems: {
                                include: {
                                    inventoryItem: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!order) {
        throw new Error('Order not found');
    }

    const stockDeductions = [];

    // Calculate total deductions needed
    for (const orderItem of order.items) {
        for (const recipeItem of orderItem.menuItem.recipeItems) {
            const totalQuantity = parseFloat(recipeItem.quantity) * orderItem.quantity;

            const existing = stockDeductions.find(
                sd => sd.inventoryItemId === recipeItem.inventoryItemId
            );

            if (existing) {
                existing.quantity += totalQuantity;
            } else {
                stockDeductions.push({
                    inventoryItemId: recipeItem.inventoryItemId,
                    quantity: totalQuantity,
                    name: recipeItem.inventoryItem.name
                });
            }
        }
    }

    // Check if we have enough stock before deducting
    const errors = [];
    for (const deduction of stockDeductions) {
        const item = await prisma.inventoryItem.findUnique({
            where: { id: deduction.inventoryItemId }
        });

        if (!item) continue;

        const newStock = parseFloat(item.currentStock) - deduction.quantity;
        if (newStock < 0) {
            errors.push(
                `Insufficient ${item.name}: needs ${deduction.quantity}${item.unit}, have ${item.currentStock}${item.unit}`
            );
        }
    }

    if (errors.length > 0) {
        throw new Error(`Stock shortage: ${errors.join('; ')}`);
    }

    // Perform deductions
    const results = [];
    for (const deduction of stockDeductions) {
        const result = await deductStock(deduction.inventoryItemId, deduction.quantity);
        results.push(result);
    }

    return results;
}
