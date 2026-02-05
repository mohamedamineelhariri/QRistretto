import prisma from '../config/database.js';

/**
 * Parse CIDR notation and check if IP is in range
 * Example: isIPInRange("192.168.1.50", "192.168.1.0/24") => true
 */
function isIPInRange(ip, cidr) {
    // Handle IPv4-mapped IPv6 addresses
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    // Handle localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        // In development, always allow localhost
        if (process.env.NODE_ENV === 'development') {
            return true;
        }
    }

    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    // Convert IP addresses to numbers
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    if (ipParts.length !== 4 || rangeParts.length !== 4) {
        return false;
    }

    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];

    // Create mask
    const maskNum = ~((1 << (32 - mask)) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
}

/**
 * Get client IP address from request
 * Handles proxies and various header formats
 */
function getClientIP(req) {
    // Check various headers (in order of preference)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // Take first IP if multiple
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    // Fall back to connection remote address
    return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;
}

/**
 * Middleware: Validate customer is on restaurant Wi-Fi
 * Security: Strict IP validation with multi-network support
 */
export const validateWifi = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant ID required.',
            });
        }

        // Get all active Wi-Fi networks for this restaurant
        const networks = await prisma.wifiNetwork.findMany({
            where: {
                restaurantId,
                isActive: true,
            },
        });

        if (networks.length === 0) {
            // No networks configured - allow in development, block in production
            if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ No Wi-Fi networks configured - allowing in dev mode');
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Wi-Fi validation not configured.',
                code: 'WIFI_NOT_CONFIGURED',
            });
        }

        const clientIP = getClientIP(req);
        console.log(`🔍 Checking IP: ${clientIP}`);

        // Check if client IP matches any configured network
        const isValidNetwork = networks.some(network => {
            const isInRange = isIPInRange(clientIP, network.ipRange);
            console.log(`   Checking ${network.networkName} (${network.ipRange}): ${isInRange}`);
            return isInRange;
        });

        if (!isValidNetwork) {
            return res.status(403).json({
                success: false,
                message: 'Please connect to the restaurant Wi-Fi to place your order.',
                messageAr: 'يرجى الاتصال بشبكة Wi-Fi الخاصة بالمطعم لتقديم طلبك.',
                messageFr: 'Veuillez vous connecter au Wi-Fi du restaurant pour passer votre commande.',
                code: 'WIFI_REQUIRED',
            });
        }

        // Valid - attach network info to request
        req.clientIP = clientIP;
        next();
    } catch (error) {
        console.error('Wi-Fi validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Wi-Fi validation error.',
        });
    }
};

/**
 * Skip Wi-Fi validation for staff routes (they have PIN auth)
 */
export const skipWifiForStaff = (req, res, next) => {
    // Staff routes bypass Wi-Fi check
    next();
};
