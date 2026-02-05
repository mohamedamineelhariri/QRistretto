import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import * as menuService from '../services/menu.service.js';

const router = express.Router();

/**
 * GET /api/menu/:restaurantId
 * Get menu for customers (public, but requires valid QR token)
 */
router.get(
    '/:restaurantId',
    [
        param('restaurantId').isUUID().withMessage('Invalid restaurant ID'),
        query('locale').optional().isIn(['en', 'fr', 'ar']).withMessage('Locale must be en, fr, or ar'),
        validate,
    ],
    async (req, res) => {
        try {
            const { restaurantId } = req.params;
            const locale = req.query.locale || 'en';

            const menu = await menuService.getMenuByRestaurant(restaurantId, locale);

            res.json({
                success: true,
                data: {
                    categories: menu,
                    locale,
                },
            });
        } catch (error) {
            console.error('Get menu error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch menu',
            });
        }
    }
);

/**
 * GET /api/menu/admin/all
 * Get all menu items for admin (includes unavailable)
 */
router.get(
    '/admin/all',
    verifyToken,
    async (req, res) => {
        try {
            const items = await menuService.getAllMenuItems(req.restaurantId);

            res.json({
                success: true,
                data: { items },
            });
        } catch (error) {
            console.error('Get all menu items error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch menu items',
            });
        }
    }
);

/**
 * POST /api/menu
 * Create new menu item (admin only)
 */
router.post(
    '/',
    verifyToken,
    [
        body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name required (max 100 chars)'),
        body('category').trim().isLength({ min: 1, max: 50 }).withMessage('Category required'),
        body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
        body('nameFr').optional().trim().isLength({ max: 100 }),
        body('nameAr').optional().trim().isLength({ max: 100 }),
        body('description').optional().trim().isLength({ max: 500 }),
        body('descriptionFr').optional().trim().isLength({ max: 500 }),
        body('descriptionAr').optional().trim().isLength({ max: 500 }),
        body('categoryFr').optional().trim().isLength({ max: 50 }),
        body('categoryAr').optional().trim().isLength({ max: 50 }),
        body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
        body('available').optional().isBoolean(),
        body('sortOrder').optional().isInt({ min: 0 }),
        validate,
    ],
    async (req, res) => {
        try {
            const item = await menuService.createMenuItem(req.restaurantId, req.body);

            res.status(201).json({
                success: true,
                message: 'Menu item created',
                data: { item },
            });
        } catch (error) {
            console.error('Create menu item error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create menu item',
            });
        }
    }
);

/**
 * PUT /api/menu/:itemId
 * Update menu item (admin only)
 */
router.put(
    '/:itemId',
    verifyToken,
    [
        param('itemId').isUUID().withMessage('Invalid item ID'),
        body('name').optional().trim().isLength({ min: 1, max: 100 }),
        body('category').optional().trim().isLength({ min: 1, max: 50 }),
        body('price').optional().isFloat({ min: 0 }),
        body('available').optional().isBoolean(),
        validate,
    ],
    async (req, res) => {
        try {
            const item = await menuService.updateMenuItem(
                req.params.itemId,
                req.restaurantId,
                req.body
            );

            res.json({
                success: true,
                message: 'Menu item updated',
                data: { item },
            });
        } catch (error) {
            console.error('Update menu item error:', error);
            if (error.message === 'Menu item not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Menu item not found',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to update menu item',
            });
        }
    }
);

/**
 * PATCH /api/menu/:itemId/toggle
 * Toggle item availability (admin only)
 */
router.patch(
    '/:itemId/toggle',
    verifyToken,
    [
        param('itemId').isUUID().withMessage('Invalid item ID'),
        validate,
    ],
    async (req, res) => {
        try {
            const item = await menuService.toggleItemAvailability(
                req.params.itemId,
                req.restaurantId
            );

            // Emit socket event for real-time update
            const io = req.app.get('io');
            io.to(`restaurant:${req.restaurantId}`).emit('menu:updated', {
                itemId: item.id,
                available: item.available,
            });

            res.json({
                success: true,
                message: `Item ${item.available ? 'enabled' : 'disabled'}`,
                data: { item },
            });
        } catch (error) {
            console.error('Toggle availability error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle availability',
            });
        }
    }
);

/**
 * DELETE /api/menu/:itemId
 * Delete menu item (admin only)
 */
router.delete(
    '/:itemId',
    verifyToken,
    [
        param('itemId').isUUID().withMessage('Invalid item ID'),
        validate,
    ],
    async (req, res) => {
        try {
            await menuService.deleteMenuItem(req.params.itemId, req.restaurantId);

            res.json({
                success: true,
                message: 'Menu item deleted',
            });
        } catch (error) {
            console.error('Delete menu item error:', error);
            if (error.message === 'Menu item not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Menu item not found',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to delete menu item',
            });
        }
    }
);

/**
 * GET /api/menu/categories/:restaurantId
 * Get unique categories
 */
router.get(
    '/categories/:restaurantId',
    [
        param('restaurantId').isUUID().withMessage('Invalid restaurant ID'),
        validate,
    ],
    async (req, res) => {
        try {
            const categories = await menuService.getCategories(req.params.restaurantId);

            res.json({
                success: true,
                data: { categories },
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
            });
        }
    }
);

export default router;
