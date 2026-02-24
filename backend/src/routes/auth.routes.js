import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import prisma from '../config/database.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Admin login - returns JWT token
 */
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        validate,
    ],
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find restaurant by admin email
            const restaurant = await prisma.restaurant.findUnique({
                where: { adminEmail: email },
                select: {
                    id: true,
                    name: true,
                    adminEmail: true,
                    adminPassword: true,
                    isActive: true,
                },
            });

            // Generic error message (don't reveal if email exists)
            if (!restaurant || !restaurant.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, restaurant.adminPassword);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    restaurantId: restaurant.id,
                    email: restaurant.adminEmail,
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Set secure cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    restaurant: {
                        id: restaurant.id,
                        name: restaurant.name,
                        email: restaurant.adminEmail,
                    },
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
            });
        }
    }
);

/**
 * POST /api/auth/register
 * Register new restaurant (for initial setup)
 */
router.post(
    '/register',
    [
        body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        validate,
    ],
    async (req, res) => {
        try {
            const { name, nameFr, nameAr, email, password } = req.body;

            // Check if email already exists
            const existing = await prisma.restaurant.findUnique({
                where: { adminEmail: email },
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered',
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create restaurant
            const restaurant = await prisma.restaurant.create({
                data: {
                    name,
                    nameFr,
                    nameAr,
                    adminEmail: email,
                    adminPassword: hashedPassword,
                },
                select: {
                    id: true,
                    name: true,
                    adminEmail: true,
                    createdAt: true,
                },
            });

            res.status(201).json({
                success: true,
                message: 'Restaurant registered successfully',
                data: { restaurant },
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration failed',
            });
        }
    }
);

/**
 * POST /api/auth/logout
 * Clear auth cookie
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * POST /api/auth/staff-login
 * Staff login with PIN
 */
router.post(
    '/staff-login',
    [
        body('staffId').isUUID().withMessage('Valid staff ID required'),
        body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4-6 digits'),
        validate,
    ],
    async (req, res) => {
        try {
            const { staffId, pin } = req.body;

            const staff = await prisma.staff.findUnique({
                where: { id: staffId },
                include: {
                    restaurant: {
                        select: { id: true, name: true, isActive: true },
                    },
                },
            });

            if (!staff || !staff.isActive || !staff.restaurant.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Verify PIN
            const isValidPin = await bcrypt.compare(pin, staff.pin);

            if (!isValidPin) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Generate staff token (shorter expiry)
            const token = jwt.sign(
                {
                    staffId: staff.id,
                    restaurantId: staff.restaurantId,
                    role: staff.role,
                },
                process.env.JWT_SECRET,
                { expiresIn: '12h' }
            );

            res.json({
                success: true,
                message: 'Staff login successful',
                data: {
                    token,
                    staff: {
                        id: staff.id,
                        name: staff.name,
                        role: staff.role,
                        restaurantId: staff.restaurantId, // CRITICAL: Needed for socket room joining
                    },
                    restaurant: staff.restaurant,
                },
            });
        } catch (error) {
            console.error('Staff login error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

/**
 * GET /api/auth/staff
 * Get list of active staff for login screen (Public)
 */
router.get('/staff', async (req, res) => {
    try {
        // For this single-tenant demo, getting the first active restaurant
        // In multi-tenant, we'd pass restaurant slug/ID in query or header
        const restaurant = await prisma.restaurant.findFirst({
            where: { isActive: true },
            select: { id: true },
        });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'No active restaurant found',
            });
        }

        const staff = await prisma.staff.findMany({
            where: {
                restaurantId: restaurant.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({
            success: true,
            data: { staff },
        });
    } catch (error) {
        console.error('Fetch staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff list',
        });
    }
});

export default router;
