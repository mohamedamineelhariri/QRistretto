import express from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import prisma from '../config/database.js';

const router = express.Router();

/**
 * GET /api/tables
 * Get all tables for restaurant (admin)
 */
router.get(
    '/',
    verifyToken,
    async (req, res) => {
        try {
            const tables = await prisma.table.findMany({
                where: { restaurantId: req.restaurantId },
                include: {
                    qrTokens: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    _count: {
                        select: {
                            orders: {
                                where: {
                                    status: { notIn: ['DELIVERED', 'CANCELLED'] },
                                },
                            },
                        },
                    },
                },
                orderBy: { tableNumber: 'asc' },
            });

            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            const tablesWithQR = await Promise.all(tables.map(async (table) => {
                const activeToken = table.qrTokens[0];
                let qrCodes = [];

                // Always provide a QR code image for the table (Permanent QR)
                const apiBaseUrl = process.env.API_URL || 'http://192.168.137.1:5000';
                const qrUrl = `${apiBaseUrl}/api/qr/scan/${table.id}`;
                const qrDataUrl = await (async () => {
                    try {
                        const QRCode = (await import('qrcode')).default;
                        return await QRCode.toDataURL(qrUrl, { width: 400, margin: 2 });
                    } catch (e) {
                        return null;
                    }
                })();

                if (activeToken) {
                    qrCodes = [{
                        id: activeToken.id,
                        token: activeToken.token,
                        qrUrl,
                        qrDataUrl,
                        expiresAt: activeToken.expiresAt,
                        active: new Date(activeToken.expiresAt) > new Date()
                    }];
                } else {
                    // Even if no token, provide the QR image so Admin can always "View QR"
                    qrCodes = [{
                        id: 'stable',
                        token: 'stable',
                        qrUrl,
                        qrDataUrl,
                        expiresAt: new Date(0).toISOString(), // Expired
                        active: false
                    }];
                }

                return {
                    ...table,
                    qrCodes,
                    qrTokens: undefined // Clean up
                };
            }));

            res.json({
                success: true,
                data: { tables: tablesWithQR },
            });
        } catch (error) {
            console.error('Get tables error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch tables',
            });
        }
    }
);

/**
 * POST /api/tables
 * Create new table (admin)
 */
router.post(
    '/',
    verifyToken,
    [
        body('tableNumber').isInt({ min: 1, max: 999 }).withMessage('Table number must be 1-999'),
        body('tableName').optional().trim().isLength({ max: 50 }),
        body('capacity').optional().isInt({ min: 1, max: 50 }),
        validate,
    ],
    async (req, res) => {
        try {
            const { tableNumber, tableName, capacity } = req.body;

            // Check if table number already exists
            const existing = await prisma.table.findFirst({
                where: {
                    restaurantId: req.restaurantId,
                    tableNumber,
                },
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: `Table ${tableNumber} already exists`,
                });
            }

            const table = await prisma.table.create({
                data: {
                    restaurantId: req.restaurantId,
                    tableNumber,
                    tableName,
                    capacity: capacity || 4,
                },
            });

            res.status(201).json({
                success: true,
                message: 'Table created',
                data: { table },
            });
        } catch (error) {
            console.error('Create table error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create table',
            });
        }
    }
);

/**
 * PUT /api/tables/:tableId
 * Update table (admin)
 */
router.put(
    '/:tableId',
    verifyToken,
    [
        param('tableId').isUUID(),
        body('tableName').optional().trim().isLength({ max: 50 }),
        body('capacity').optional().isInt({ min: 1, max: 50 }),
        body('isActive').optional().isBoolean(),
        validate,
    ],
    async (req, res) => {
        try {
            const { tableId } = req.params;
            const { tableName, capacity, isActive } = req.body;

            // Verify table belongs to restaurant
            const table = await prisma.table.findFirst({
                where: { id: tableId, restaurantId: req.restaurantId },
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found',
                });
            }

            const updated = await prisma.table.update({
                where: { id: tableId },
                data: { tableName, capacity, isActive },
            });

            res.json({
                success: true,
                message: 'Table updated',
                data: { table: updated },
            });
        } catch (error) {
            console.error('Update table error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update table',
            });
        }
    }
);

/**
 * DELETE /api/tables/:tableId
 * Delete table (admin)
 */
router.delete(
    '/:tableId',
    verifyToken,
    [
        param('tableId').isUUID(),
        validate,
    ],
    async (req, res) => {
        try {
            const { tableId } = req.params;

            // Verify table belongs to restaurant
            const table = await prisma.table.findFirst({
                where: { id: tableId, restaurantId: req.restaurantId },
            });

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found',
                });
            }

            await prisma.table.delete({
                where: { id: tableId },
            });

            res.json({
                success: true,
                message: 'Table deleted',
            });
        } catch (error) {
            console.error('Delete table error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete table',
            });
        }
    }
);

export default router;
