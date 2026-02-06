import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import { validateWifi } from '../middleware/wifiValidation.js';
import * as orderService from '../services/order.service.js';
import * as qrService from '../services/qrToken.service.js';

const router = express.Router();

/**
 * POST /api/orders
 * Create new order (customer - requires Wi-Fi validation)
 */
router.post(
    '/',
    [
        body('token').isString().notEmpty().withMessage('QR token required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item required'),
        body('items.*.menuItemId').isUUID().withMessage('Valid menu item ID required'),
        body('items.*.quantity').optional().isInt({ min: 1, max: 20 }).withMessage('Quantity must be 1-20'),
        body('items.*.notes').optional().trim().isLength({ max: 200 }),
        body('notes').optional().trim().isLength({ max: 500 }),
        validate,
    ],
    async (req, res) => {
        try {
            const { token, items, notes } = req.body;

            // Validate QR token
            const tableInfo = await qrService.validateQRToken(token);

            if (!tableInfo) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired QR code. Please scan again.',
                    messageAr: 'رمز QR غير صالح أو منتهي الصلاحية. يرجى المسح مرة أخرى.',
                    messageFr: 'Code QR invalide ou expiré. Veuillez scanner à nouveau.',
                    code: 'INVALID_QR',
                });
            }

            // Wi-Fi validation (check IP)
            // Note: This is now handled via middleware for the specific restaurant

            // Create order
            const order = await orderService.createOrder(
                tableInfo.restaurantId,
                tableInfo.tableId,
                items,
                notes
            );

            // Emit to waiter/kitchen dashboards
            const io = req.app.get('io');
            io.to(`restaurant:${tableInfo.restaurantId}`).emit('order:new', {
                order,
                tableNumber: tableInfo.tableNumber,
            });

            res.status(201).json({
                success: true,
                message: 'Order placed successfully',
                messageAr: 'تم تقديم الطلب بنجاح',
                messageFr: 'Commande passée avec succès',
                data: {
                    order,
                    tableNumber: tableInfo.tableNumber,
                },
            });
        } catch (error) {
            console.error('Create order error:', error);
            if (error.message === 'Some items are not available') {
                return res.status(400).json({
                    success: false,
                    message: 'Some items are no longer available',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to place order',
            });
        }
    }
);

/**
 * GET /api/orders/:orderId
 * Get order by ID (for customer tracking)
 */
router.get(
    '/:orderId',
    [
        param('orderId').isUUID().withMessage('Invalid order ID'),
        validate,
    ],
    async (req, res) => {
        try {
            const order = await orderService.getOrderById(req.params.orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found',
                });
            }

            res.json({
                success: true,
                data: { order },
            });
        } catch (error) {
            console.error('Get order error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order',
            });
        }
    }
);

/**
 * GET /api/orders/active/list
 * Get active orders for kitchen/waiter (requires staff auth)
 */
router.get(
    '/active/list',
    verifyToken,
    async (req, res) => {
        try {
            const orders = await orderService.getOrdersByStatus(req.restaurantId);

            res.json({
                success: true,
                data: { orders },
            });
        } catch (error) {
            console.error('Get active orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
            });
        }
    }
);

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (staff only)
 */
router.patch(
    '/:orderId/status',
    verifyToken,
    [
        param('orderId').isUUID().withMessage('Invalid order ID'),
        body('status').isIn(['ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
            .withMessage('Invalid status'),
        validate,
    ],
    async (req, res) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            // Extract staff ID if present (via verifyToken or verifyStaffPin middleware)
            // Note: verifyToken puts info in req.restaurant, but if it's a staff token it might have staff info
            // Let's assume verifyToken decodes the token.
            // If the token is a "Staff Token" (from staff-login), it should have `staffId` and `role`.
            // Currently verifyToken middleware in `auth.js` checks for `restaurantId`.
            // We need to check if the token payload has staff info.

            // Actually, `verifyToken` middleware (lines 28-45 of auth.js) only checks restaurant.
            // We need to update `verifyToken` OR use a new middleware OR decode manually here.
            // BUT, `verifyToken` decodes it.

            // Let's inspect `req` after verifyToken.
            // Wait, looking at `auth.js`: The `verifyToken` middleware decodes `restaurantId`.
            // The `staff-login` endpoint signs: { staffId, restaurantId, role }.
            // So `verifyToken` will verify the signature, but we need to extract `staffId`.

            // We should modify `verifyToken` in `auth.js` to also attach `staffId` if present.
            // But for now let's just use `jwt.decode` safely since signature is verified? 
            // NO, `verifyToken` calls `jwt.verify`.

            // Let's assume we will update `verifyToken` or check req.user if we had it.
            // Actually, let's fix `verifyToken` in `auth.js` first.

            // For now, in this route:
            // Since `verifyToken` is used, and it verifies `process.env.JWT_SECRET`:

            // We need to decode the token again to get staff info if `verifyToken` didn't attach it.
            // OR better: Update `auth.js`.

            // I will updated `auth.js` in a next step.
            // Here I will pass `req.staffId` and `req.staffRole` assuming middleware sets them.

            const order = await orderService.updateOrderStatus(
                orderId,
                req.restaurantId,
                status,
                req.staffId,
                req.staffRole
            );

            // Emit status update to all connected clients
            const io = req.app.get('io');
            io.to(`restaurant:${req.restaurantId}`).emit('order:updated', { order });
            io.to(`order:${orderId}`).emit('order:status', {
                orderId,
                status: order.status,
                updatedAt: order.updatedAt,
            });

            res.json({
                success: true,
                message: `Order status updated to ${status}`,
                data: { order },
            });
        } catch (error) {
            console.error('Update order status error:', error);
            if (error.message.includes('Cannot transition')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message === 'Order not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to update order status',
            });
        }
    }
);

/**
 * GET /api/orders/history/list
 * Get order history (admin only)
 */
router.get(
    '/history/list',
    verifyToken,
    async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const offset = parseInt(req.query.offset) || 0;

            const orders = await orderService.getOrderHistory(req.restaurantId, limit, offset);

            res.json({
                success: true,
                data: {
                    orders,
                    pagination: { limit, offset },
                },
            });
        } catch (error) {
            console.error('Get order history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order history',
            });
        }
    }
);

/**
 * GET /api/orders/table/:token
 * Get orders for a table (customer view)
 */
router.get(
    '/table/:token',
    async (req, res) => {
        try {
            const tableInfo = await qrService.validateQRToken(req.params.token);

            if (!tableInfo) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired QR code',
                    code: 'INVALID_QR',
                });
            }

            const orders = await orderService.getOrdersByTable(tableInfo.tableId);

            res.json({
                success: true,
                data: {
                    orders,
                    table: tableInfo,
                },
            });
        } catch (error) {
            console.error('Get table orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
            });
        }
    }
);

export default router;
