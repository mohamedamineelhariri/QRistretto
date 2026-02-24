import express from 'express';
import { param, query } from 'express-validator';
import { validate } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import * as qrService from '../services/qrToken.service.js';
import { validateWifi } from '../middleware/wifiValidation.js';

const router = express.Router();

/**
 * GET /api/qr/scan/:tableId
 * Dynamic redirector: Generates a new token for the table and redirects to frontend
 * This allows the printed QR code to stay permanent while the session token rotates
 */
router.get(
    '/scan/:tableId',
    [
        param('tableId').isUUID().withMessage('Invalid table ID'),
        validate,
        validateWifi,
    ],
    async (req, res) => {
        try {
            const { tableId } = req.params;
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            console.log(`[QR Scan] Table scan detected: ${tableId}`);

            // Auto-generate fresh token instant
            const tokenData = await qrService.createQRToken(tableId);

            // Notify Admin UI to refresh this table's info (and timer)
            const io = req.app.get('io');
            if (io) {
                // We don't have restaurantId here easily, so we emit to everyone for simplicity 
                // or we could get it from tokenData.restaurantId
                io.to(`restaurant:${tokenData.restaurantId}`).emit('table:updated', { tableId });
            }

            // Redirect customer to frontend with the new token
            const redirectUrl = `${baseUrl}?token=${tokenData.token}`;
            console.log(`[QR Scan] Redirecting to: ${redirectUrl}`);

            res.redirect(redirectUrl);
        } catch (error) {
            console.error('QR Scan error:', error);
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${baseUrl}?error=table_not_found`);
        }
    }
);

/**
 * GET /api/qr/validate/:token
 * Validate a QR token and get table/restaurant info
 */
router.get(
    '/validate/:token',
    [
        param('token').isString().notEmpty().withMessage('Token required'),
        validate,
    ],
    async (req, res) => {
        try {
            console.log(`[QR Route] Validating token: ${req.params.token}`);
            const tableInfo = await qrService.validateQRToken(req.params.token);
            console.log(`[QR Route] Result for ${req.params.token}: ${tableInfo ? 'Success' : 'Failed'}`);

            if (!tableInfo) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired QR code. Please ask staff for a new code.',
                    messageAr: 'رمز QR غير صالح أو منتهي الصلاحية. يرجى طلب رمز جديد من الموظف.',
                    messageFr: 'Code QR invalide ou expiré. Veuillez demander un nouveau code au personnel.',
                    code: 'INVALID_QR',
                });
            }

            res.json({
                success: true,
                data: tableInfo,
            });
        } catch (error) {
            console.error('Validate QR error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate QR code',
            });
        }
    }
);

/**
 * POST /api/qr/generate/:tableId
 * Generate new QR code for a table (admin only)
 */
router.post(
    '/generate/:tableId',
    verifyToken,
    [
        param('tableId').isUUID().withMessage('Invalid table ID'),
        validate,
    ],
    async (req, res) => {
        try {
            const { tableId } = req.params;
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            console.log(`[QR Route] Generating QR for table ${tableId} with baseUrl: ${baseUrl}`);

            const qrData = await qrService.generateQRCodeImage(tableId, baseUrl);

            res.json({
                success: true,
                message: 'QR code generated',
                data: qrData,
            });
        } catch (error) {
            console.error('Generate QR error:', error);
            if (error.message === 'Table not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Table not found',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to generate QR code',
            });
        }
    }
);

/**
 * POST /api/qr/refresh-all
 * Refresh all QR codes for the restaurant (admin only)
 * This invalidates all existing QR codes
 */
router.post(
    '/refresh-all',
    verifyToken,
    async (req, res) => {
        try {
            const tokens = await qrService.refreshAllTokens(req.restaurantId);

            // Emit socket event to notify connected clients
            const io = req.app.get('io');
            io.to(`restaurant:${req.restaurantId}`).emit('qr:refreshed', {
                message: 'All QR codes have been refreshed',
                count: tokens.length,
            });

            res.json({
                success: true,
                message: `${tokens.length} QR codes refreshed`,
                data: { count: tokens.length },
            });
        } catch (error) {
            console.error('Refresh all QR error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh QR codes',
            });
        }
    }
);

/**
 * POST /api/qr/cleanup
 * Cleanup expired tokens (can be called by cron job)
 */
router.post(
    '/cleanup',
    async (req, res) => {
        try {
            // Simple API key check for cron job
            const apiKey = req.headers['x-api-key'];
            if (apiKey !== process.env.CRON_API_KEY && process.env.NODE_ENV === 'production') {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const count = await qrService.cleanupExpiredTokens();

            res.json({
                success: true,
                message: `${count} expired tokens cleaned up`,
                data: { count },
            });
        } catch (error) {
            console.error('Cleanup tokens error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup tokens',
            });
        }
    }
);

export default router;
