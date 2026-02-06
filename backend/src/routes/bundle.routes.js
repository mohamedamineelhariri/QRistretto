import express from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import * as bundleService from '../services/bundle.service.js';

const router = express.Router();

/**
 * GET /api/admin/bundles
 * Get all bundles
 */
router.get(
    '/',
    verifyToken,
    async (req, res) => {
        try {
            const bundles = await bundleService.getAllBundles(req.restaurantId);

            res.json({
                success: true,
                data: { bundles }
            });
        } catch (error) {
            console.error('Get bundles error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bundles'
            });
        }
    }
);

/**
 * GET /api/admin/bundles/:id
 * Get single bundle
 */
router.get(
    '/:id',
    verifyToken,
    [
        param('id').isUUID().withMessage('Invalid ID'),
        validate
    ],
    async (req, res) => {
        try {
            const bundle = await bundleService.getBundle(req.params.id, req.restaurantId);

            if (!bundle) {
                return res.status(404).json({
                    success: false,
                    message: 'Bundle not found'
                });
            }

            res.json({
                success: true,
                data: { bundle }
            });
        } catch (error) {
            console.error('Get bundle error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bundle'
            });
        }
    }
);

/**
 * POST /api/admin/bundles
 * Create new bundle
 */
router.post(
    '/',
    verifyToken,
    [
        body('name').trim().notEmpty().withMessage('Name required'),
        body('price').isNumeric().withMessage('Price must be a number'),
        body('items').isArray({ min: 1 }).withMessage('Bundle must have at least one item'),
        body('items.*.menuItemId').isUUID().withMessage('Invalid menu item ID'),
        body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        validate
    ],
    async (req, res) => {
        try {
            const bundle = await bundleService.createBundle(
                req.restaurantId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Bundle created',
                data: { bundle }
            });
        } catch (error) {
            console.error('Create bundle error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create bundle'
            });
        }
    }
);

/**
 * PUT /api/admin/bundles/:id
 * Update bundle
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
            const bundle = await bundleService.updateBundle(
                req.params.id,
                req.restaurantId,
                req.body
            );

            res.json({
                success: true,
                message: 'Bundle updated',
                data: { bundle }
            });
        } catch (error) {
            console.error('Update bundle error:', error);
            if (error.message === 'Bundle not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update bundle'
            });
        }
    }
);

/**
 * PATCH /api/admin/bundles/:id/toggle
 * Toggle bundle availability
 */
router.patch(
    '/:id/toggle',
    verifyToken,
    [
        param('id').isUUID().withMessage('Invalid ID'),
        validate
    ],
    async (req, res) => {
        try {
            const bundle = await bundleService.toggleBundleAvailability(
                req.params.id,
                req.restaurantId
            );

            res.json({
                success: true,
                message: 'Bundle availability toggled',
                data: { bundle }
            });
        } catch (error) {
            console.error('Toggle bundle error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to toggle bundle'
            });
        }
    }
);

/**
 * DELETE /api/admin/bundles/:id
 * Delete bundle
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
            await bundleService.deleteBundle(
                req.params.id,
                req.restaurantId
            );

            res.json({
                success: true,
                message: 'Bundle deleted'
            });
        } catch (error) {
            console.error('Delete bundle error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete bundle'
            });
        }
    }
);

export default router;
