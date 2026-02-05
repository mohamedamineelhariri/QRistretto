import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

/**
 * Verify JWT token for admin routes
 * Security: Token validation with proper error handling
 */
export const verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header or cookie
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if restaurant still exists and is active
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: decoded.restaurantId },
            select: { id: true, isActive: true, name: true },
        });

        if (!restaurant || !restaurant.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Restaurant not found or inactive.',
            });
        }

        // Attach restaurant info to request
        req.restaurant = restaurant;
        req.restaurantId = decoded.restaurantId;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.',
        });
    }
};

/**
 * Verify staff PIN for waiter/kitchen access
 */
export const verifyStaffPin = async (req, res, next) => {
    try {
        const { staffId, pin } = req.body;

        if (!staffId || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Staff ID and PIN required.',
            });
        }

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: { restaurant: { select: { id: true, isActive: true } } },
        });

        if (!staff || !staff.isActive || !staff.restaurant.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            });
        }

        // Compare PIN (stored hashed)
        const bcrypt = await import('bcryptjs');
        const isValidPin = await bcrypt.compare(pin, staff.pin);

        if (!isValidPin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            });
        }

        req.staff = staff;
        req.restaurantId = staff.restaurantId;

        next();
    } catch (error) {
        console.error('Staff auth error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.',
        });
    }
};

/**
 * Optional auth - attaches restaurant if token present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.restaurantId = decoded.restaurantId;
        }
    } catch (error) {
        // Token invalid or missing - that's okay for optional auth
    }

    next();
};
