import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import prisma from '../config/database.js';

/**
 * Generate a new secure random token
 */
function generateSecureToken() {
    // Combine UUID with timestamp for extra entropy
    return `${uuidv4()}-${Date.now().toString(36)}`;
}

/**
 * Get token expiry time based on config
 */
function getExpiryTime() {
    // Desired behavior: 15 minutes. Fallback to 15 if env is missing.
    const minutes = parseInt(process.env.QR_TOKEN_EXPIRY_MINUTES) || 15;
    console.log(`[QR Token] Calculating expiry: ${minutes} minutes`);
    return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Create or refresh a QR token for a table
 * Security: Old tokens are invalidated when new one is created
 */
export async function createQRToken(tableId) {
    // First, verify table exists
    const table = await prisma.table.findUnique({
        where: { id: tableId },
        include: { restaurant: { select: { id: true, name: true } } },
    });

    if (!table) {
        throw new Error('Table not found');
    }

    // Generate new token
    const token = generateSecureToken();
    const expiresAt = getExpiryTime();

    // Create new token (old ones will be cleaned up by cron/scheduled task)
    const qrToken = await prisma.qRToken.create({
        data: {
            tableId,
            token,
            expiresAt,
        },
    });

    return {
        token: qrToken.token,
        expiresAt: qrToken.expiresAt,
        tableId,
        tableNumber: table.tableNumber,
        restaurantId: table.restaurant.id,
        restaurantName: table.restaurant.name,
    };
}

/**
 * Validate a QR token
 * Returns table info if valid, null if invalid/expired
 */
export async function validateQRToken(token) {
    const now = new Date();

    // First find the token to see why it might be failing or passing
    const qrToken = await prisma.qRToken.findFirst({
        where: { token },
        include: {
            table: {
                include: {
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            nameFr: true,
                            nameAr: true,
                        },
                    },
                },
            },
        },
    });

    if (!qrToken) {
        return null;
    }

    const isExpired = new Date(qrToken.expiresAt) <= now;

    if (isExpired) {
        return null;
    }

    if (!qrToken.table.isActive) {
        return null;
    }

    return {
        tableId: qrToken.table.id,
        tableNumber: qrToken.table.tableNumber,
        tableName: qrToken.table.tableName,
        restaurantId: qrToken.table.restaurant.id,
        restaurant: qrToken.table.restaurant,
        expiresAt: qrToken.expiresAt,
    };
}

/**
 * Generate QR code image as data URL
 */
export async function generateQRCodeImage(tableId, baseUrl) {
    const tokenData = await createQRToken(tableId);

    // Dynamic QR system: QR points to a permanent backend redirector for this table
    // This allows the QR image to stay the same while the backend handles token rotation
    const apiBaseUrl = process.env.API_URL || 'http://192.168.137.1:5000';
    const qrUrl = `${apiBaseUrl}/api/qr/scan/${tableId}`;
    console.log(`[QR Service] Generating Permanent Dynamic QR for URL: ${qrUrl}`);

    // Generate QR code as data URL (PNG)
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 400,
        margin: 2,
        color: {
            dark: '#1C1917', // Warm black
            light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H', // High error correction
    });

    return {
        qrDataUrl,
        qrUrl,
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
        tableNumber: tokenData.tableNumber,
    };
}

/**
 * Cleanup expired tokens
 * Should be called periodically (cron job)
 */
export async function cleanupExpiredTokens() {
    const result = await prisma.qRToken.deleteMany({
        where: {
            expiresAt: { lt: new Date() },
        },
    });

    return result.count;
}

/**
 * Refresh all tokens for a restaurant
 * Used when admin wants to invalidate all existing QR codes
 */
export async function refreshAllTokens(restaurantId) {
    // Get all active tables
    const tables = await prisma.table.findMany({
        where: {
            restaurantId,
            isActive: true,
        },
    });

    // Delete all existing tokens for these tables
    await prisma.qRToken.deleteMany({
        where: {
            tableId: { in: tables.map(t => t.id) },
        },
    });

    // Generate new tokens for each table
    const newTokens = await Promise.all(
        tables.map(table => createQRToken(table.id))
    );

    return newTokens;
}
