import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import * as inventoryService from '../services/inventory.service.js';

const router = express.Router();

/**
 * GET /api/admin/inventory
 * Get all inventory items
 */
router.get(
    '/',
    verifyToken,
    async (req, res) => {
        try {
            const items = await inventoryService.getAllInventoryItems(req.restaurantId);

            res.json({
                success: true,
                data: { items }
            });
        } catch (error) {
            console.error('Get inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory'
            });
        }
    }
);

/**
 * GET /api/admin/inventory/low-stock
 * Get items below minimum stock
 */
router.get(
    '/low-stock',
    verifyToken,
    async (req, res) => {
        try {
            const items = await inventoryService.getLowStockItems(req.restaurantId);

            res.json({
                success: true,
                data: { items }
            });
        } catch (error) {
            console.error('Get low stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch low stock items'
            });
        }
    }
);

/**
 * POST /api/admin/inventory
 * Create new inventory item
 */
router.post(
    '/',
    verifyToken,
    [
        body('name').trim().notEmpty().withMessage('Name required'),
        body('unit').trim().notEmpty().withMessage('Unit required'),
        body('currentStock').isNumeric().withMessage('Current stock must be a number'),
        body('minStock').isNumeric().withMessage('Minimum stock must be a number'),
        body('costPerUnit').isNumeric().withMessage('Cost per unit must be a number'),
        validate
    ],
    async (req, res) => {
        try {
            const item = await inventoryService.createInventoryItem(
                req.restaurantId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Inventory item created',
                data: { item }
            });
        } catch (error) {
            console.error('Create inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create inventory item'
            });
        }
    }
);

/**
 * PUT /api/admin/inventory/:id
 * Update inventory item
 */
router.put(
    '/:id',
    verifyToken,
    [
        param('id').isUUID().withMessage('Invalid ID'),
        validate
    ],
    async (req, res) => {
        try {
            const item = await inventoryService.updateInventoryItem(
                req.params.id,
                req.restaurantId,
                req.body
            );

            res.json({
                success: true,
                message: 'Inventory item updated',
                data: { item }
            });
        } catch (error) {
            console.error('Update inventory error:', error);
            if (error.message === 'Inventory item not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to update inventory item'
            });
        }
    }
);

/**
 * PATCH /api/admin/inventory/:id/add-stock
 * Add stock (restocking)
 */
router.patch(
    '/:id/add-stock',
    verifyToken,
    [
        param('id').isUUID().withMessage('Invalid ID'),
        body('quantity').isNumeric().withMessage('Quantity must be a number'),
        validate
    ],
    async (req, res) => {
        try {
            const item = await inventoryService.addStock(
                req.params.id,
                req.body.quantity,
                req.restaurantId
            );

            res.json({
                success: true,
                message: 'Stock added successfully',
                data: { item }
            });
        } catch (error) {
            console.error('Add stock error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to add stock'
            });
        }
    }
);

/**
 * DELETE /api/admin/inventory/:id
 * Delete inventory item
 */
router.delete(
    '/:id',
    verifyToken,
    [
        param('id').isUUID().withMessage('Invalid ID'),
        validate
    ],
    async (req, res) => {
        try {
            await inventoryService.deleteInventoryItem(
                req.params.id,
                req.restaurantId
            );

            res.json({
                success: true,
                message: 'Inventory item deleted'
            });
        } catch (error) {
            console.error('Delete inventory error:', error);
            if (error.message.includes('used in recipes')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to delete inventory item'
            });
        }
    }
);

export default router;
