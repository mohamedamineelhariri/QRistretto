import dotenv from 'dotenv';
// Load environment variables as early as possible
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import tableRoutes from './routes/table.routes.js';
import orderRoutes from './routes/order.routes.js';
import qrRoutes from './routes/qr.routes.js';
import adminRoutes from './routes/admin.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import bundleRoutes from './routes/bundle.routes.js';

// Import socket handler
import { setupSocketHandlers } from './socket/handlers.js';

const app = express();
const httpServer = createServer(app);

// ============================================
// CORS SETUP - MUST BE AT THE TOP
// ============================================
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'capacitor://localhost',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') return callback(null, true);
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'ngrok-skip-browser-warning'],
}));

// ============================================
// SECURITY MIDDLEWARE (OWASP Best Practices)
// ============================================

// Helmet: Sets various HTTP headers for security
// Relaxed for development to allow remote mobile access
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["*"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["*"],
            connectSrc: ["*"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));


// Rate limiting: Prevent brute force attacks
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth specific rate limiting (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.',
    },
});
app.use('/api/auth/login', authLimiter);



// Body parsing with size limits (prevent large payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================
// SOCKET.IO SETUP
// ============================================
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Make io accessible in routes
app.set('io', io);

// Setup socket handlers
setupSocketHandlers(io);

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/bundles', bundleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'QR Cafe API is running',
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    });
});

// Global error handler (don't leak error details in production)
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : err.message;

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║     🍽️  QR Cafe API Server Started        ║
  ╠═══════════════════════════════════════════╣
  ║  Port: ${PORT}                               ║
  ║  Mode: ${process.env.NODE_ENV || 'development'}                      ║
  ║  Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}     ║
  ╚═══════════════════════════════════════════╝
  `);
});

export { app, io };
