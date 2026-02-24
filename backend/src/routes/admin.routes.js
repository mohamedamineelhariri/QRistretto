import express from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import prisma from '../config/database.js';

const router = express.Router();

// All admin routes require authentication
router.use(verifyToken);

/**
 * GET /api/admin/dashboard
 * Get dashboard stats
 */
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            todayOrders,
            pendingOrders,
            totalMenuItems,
            totalTables,
            todayRevenue,
        ] = await Promise.all([
            prisma.order.count({
                where: {
                    restaurantId: req.restaurantId,
                    createdAt: { gte: today },
                },
            }),
            prisma.order.count({
                where: {
                    restaurantId: req.restaurantId,
                    status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] },
                },
            }),
            prisma.menuItem.count({
                where: { restaurantId: req.restaurantId },
            }),
            prisma.table.count({
                where: { restaurantId: req.restaurantId, isActive: true },
            }),
            prisma.order.aggregate({
                where: {
                    restaurantId: req.restaurantId,
                    createdAt: { gte: today },
                    status: 'DELIVERED',
                },
                _sum: { totalAmount: true },
            }),
        ]);

        res.json({
            success: true,
            data: {
                todayOrders,
                pendingOrders,
                totalMenuItems,
                totalTables,
                todayRevenue: parseFloat(todayRevenue._sum.totalAmount || 0),
            },
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
        });
    }
});

/**
 * GET /api/admin/restaurant
 * Get restaurant details
 */
router.get('/restaurant', async (req, res) => {
    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: req.restaurantId },
            select: {
                id: true,
                name: true,
                nameFr: true,
                nameAr: true,
                adminEmail: true,
                isActive: true,
                createdAt: true,
                logoUrl: true,
                phoneNumber: true,
                address: true,
                settings: true,
                wifiNetworks: true,
                _count: {
                    select: {
                        tables: true,
                        menuItems: true,
                        staff: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: { restaurant },
        });
    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurant data',
        });
    }
});

/**
 * PUT /api/admin/restaurant
 * Update restaurant details
 */
router.put(
    '/restaurant',
    [
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('nameFr').optional().trim().isLength({ max: 100 }),
        body('nameAr').optional().trim().isLength({ max: 100 }),
        body('logoUrl').optional().isURL().withMessage('Invalid logo URL'),
        body('phoneNumber').optional().trim().isLength({ min: 5, max: 20 }).withMessage('Invalid phone number'),
        body('address').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Address required'),
        body('settings').optional().isObject().withMessage('Settings must be an object'),
        validate,
    ],
    async (req, res) => {
        try {
            const {
                name, nameFr, nameAr,
                logoUrl, phoneNumber, address,
                settings
            } = req.body;

            const restaurant = await prisma.restaurant.update({
                where: { id: req.restaurantId },
                data: {
                    name, nameFr, nameAr,
                    logoUrl, phoneNumber, address,
                    settings: settings || undefined
                },
                select: {
                    id: true,
                    name: true,
                    nameFr: true,
                    nameAr: true,
                    logoUrl: true,
                    phoneNumber: true,
                    address: true,
                    settings: true,
                },
            });

            res.json({
                success: true,
                message: 'Restaurant updated',
                data: { restaurant },
            });
        } catch (error) {
            console.error('Update restaurant error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update restaurant',
            });
        }
    }
);

/**
 * POST /api/admin/wifi-networks
 * Add WiFi network
 */
router.post(
    '/wifi-networks',
    [
        body('networkName').trim().isLength({ min: 1, max: 50 }).withMessage('Network name required'),
        body('ipRange').matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)
            .withMessage('Invalid IP range format (e.g., 192.168.1.0/24)'),
        body('networkType').optional().isIn(['main', '5G', '2.4G', 'guest']),
        validate,
    ],
    async (req, res) => {
        try {
            const { networkName, ipRange, networkType } = req.body;

            const network = await prisma.wifiNetwork.create({
                data: {
                    restaurantId: req.restaurantId,
                    networkName,
                    ipRange,
                    networkType: networkType || 'main',
                },
            });

            res.status(201).json({
                success: true,
                message: 'WiFi network added',
                data: { network },
            });
        } catch (error) {
            console.error('Add WiFi network error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add WiFi network',
            });
        }
    }
);

/**
 * DELETE /api/admin/wifi-networks/:networkId
 * Delete WiFi network
 */
router.delete(
    '/wifi-networks/:networkId',
    [
        param('networkId').isUUID(),
        validate,
    ],
    async (req, res) => {
        try {
            const network = await prisma.wifiNetwork.findFirst({
                where: {
                    id: req.params.networkId,
                    restaurantId: req.restaurantId,
                },
            });

            if (!network) {
                return res.status(404).json({
                    success: false,
                    message: 'Network not found',
                });
            }

            await prisma.wifiNetwork.delete({
                where: { id: req.params.networkId },
            });

            res.json({
                success: true,
                message: 'WiFi network deleted',
            });
        } catch (error) {
            console.error('Delete WiFi network error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete WiFi network',
            });
        }
    }
);

/**
 * GET /api/admin/staff
 * Get all staff members
 */
router.get('/staff', async (req, res) => {
    try {
        const staff = await prisma.staff.findMany({
            where: { restaurantId: req.restaurantId },
            select: {
                id: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({
            success: true,
            data: { staff },
        });
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff',
        });
    }
});

/**
 * POST /api/admin/staff
 * Create staff member
 */
router.post(
    '/staff',
    [
        body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name required'),
        body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4-6 digits'),
        body('role').isIn(['WAITER', 'KITCHEN', 'MANAGER']).withMessage('Invalid role'),
        validate,
    ],
    async (req, res) => {
        try {
            const { name, pin, role } = req.body;

            // Hash PIN
            const hashedPin = await bcrypt.hash(pin, 10);

            const staff = await prisma.staff.create({
                data: {
                    restaurantId: req.restaurantId,
                    name,
                    pin: hashedPin,
                    role,
                },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    createdAt: true,
                },
            });

            res.status(201).json({
                success: true,
                message: 'Staff member created',
                data: { staff },
            });
        } catch (error) {
            console.error('Create staff error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create staff member',
            });
        }
    }
);

/**
 * DELETE /api/admin/staff/:staffId
 * Delete staff member
 */
router.delete(
    '/staff/:staffId',
    [
        param('staffId').isUUID(),
        validate,
    ],
    async (req, res) => {
        try {
            const staff = await prisma.staff.findFirst({
                where: {
                    id: req.params.staffId,
                    restaurantId: req.restaurantId,
                },
            });

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff member not found',
                });
            }

            await prisma.staff.delete({
                where: { id: req.params.staffId },
            });

            res.json({
                success: true,
                message: 'Staff member deleted',
            });
        } catch (error) {
            console.error('Delete staff error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete staff member',
            });
        }
    }
);

export default router;
