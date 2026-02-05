import prisma from '../config/database.js';

/**
 * Generate next order number for the day
 */
async function getNextOrderNumber(restaurantId) {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's orders
    const count = await prisma.order.count({
        where: {
            restaurantId,
            createdAt: {
                gte: today,
                lt: tomorrow,
            },
        },
    });

    return count + 1;
}

/**
 * Create a new order
 * Security: Validates all items belong to the restaurant
 */
export async function createOrder(restaurantId, tableId, items, notes = null) {
    // Validate items exist and belong to restaurant
    const menuItemIds = items.map(item => item.menuItemId);

    const menuItems = await prisma.menuItem.findMany({
        where: {
            id: { in: menuItemIds },
            restaurantId,
            available: true,
        },
    });

    if (menuItems.length !== menuItemIds.length) {
        throw new Error('Some items are not available');
    }

    // Calculate total and prepare order items
    let totalAmount = 0;
    const orderItems = items.map(item => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId);
        const unitPrice = parseFloat(menuItem.price);
        const quantity = item.quantity || 1;
        totalAmount += unitPrice * quantity;

        return {
            menuItemId: item.menuItemId,
            quantity,
            unitPrice,
            notes: item.notes,
        };
    });

    // Get next order number
    const orderNumber = await getNextOrderNumber(restaurantId);

    // Create order with items in transaction
    const order = await prisma.order.create({
        data: {
            restaurantId,
            tableId,
            orderNumber,
            totalAmount,
            notes,
            status: 'PENDING',
            items: {
                create: orderItems,
            },
        },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
            table: {
                select: {
                    tableNumber: true,
                    tableName: true,
                },
            },
        },
    });

    return order;
}

/**
 * Get orders by status for kitchen/waiter view
 */
export async function getOrdersByStatus(restaurantId, statuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY']) {
    return prisma.order.findMany({
        where: {
            restaurantId,
            status: { in: statuses },
        },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
            table: {
                select: {
                    tableNumber: true,
                    tableName: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId) {
    return prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
            table: {
                select: {
                    tableNumber: true,
                    tableName: true,
                },
            },
        },
    });
}

/**
 * Update order status
 * Security: Only allows valid status transitions
 */
export async function updateOrderStatus(orderId, restaurantId, newStatus) {
    // Define valid transitions
    const validTransitions = {
        PENDING: ['ACCEPTED', 'CANCELLED'],
        ACCEPTED: ['PREPARING', 'CANCELLED'],
        PREPARING: ['READY', 'CANCELLED'],
        READY: ['DELIVERED'],
        DELIVERED: [], // Final state
        CANCELLED: [], // Final state
    };

    const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId },
    });

    if (!order) {
        throw new Error('Order not found');
    }

    if (!validTransitions[order.status].includes(newStatus)) {
        throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
    }

    return prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
            table: {
                select: {
                    tableNumber: true,
                    tableName: true,
                },
            },
        },
    });
}

/**
 * Get order history (completed orders)
 */
export async function getOrderHistory(restaurantId, limit = 50, offset = 0) {
    return prisma.order.findMany({
        where: {
            restaurantId,
            status: { in: ['DELIVERED', 'CANCELLED'] },
        },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
            table: {
                select: {
                    tableNumber: true,
                    tableName: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
}

/**
 * Get orders for a specific table (customer view)
 */
export async function getOrdersByTable(tableId) {
    // Get today's orders only
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.order.findMany({
        where: {
            tableId,
            createdAt: { gte: today },
        },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
