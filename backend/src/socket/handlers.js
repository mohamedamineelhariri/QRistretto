/**
 * Socket.io Event Handlers
 * Real-time communication for orders and menu updates
 */

export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`📡 Socket connected: ${socket.id}`);

        // Join restaurant room (for staff dashboards)
        socket.on('join:restaurant', (restaurantId) => {
            if (restaurantId) {
                socket.join(`restaurant:${restaurantId}`);
                console.log(`   Joined restaurant room: ${restaurantId}`);
            }
        });

        // Join order room (for customer tracking)
        socket.on('join:order', (orderId) => {
            if (orderId) {
                socket.join(`order:${orderId}`);
                console.log(`   Joined order room: ${orderId}`);
            }
        });

        // Leave rooms
        socket.on('leave:restaurant', (restaurantId) => {
            socket.leave(`restaurant:${restaurantId}`);
        });

        socket.on('leave:order', (orderId) => {
            socket.leave(`order:${orderId}`);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`📡 Socket disconnected: ${socket.id}`);
        });

        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    // Log socket.io server status
    console.log('🔌 Socket.io handlers initialized');
}

/**
 * Events emitted by the server:
 * 
 * order:new      - New order created (to restaurant room)
 * order:updated  - Order status changed (to restaurant room)
 * order:status   - Order status for customer (to order room)
 * menu:updated   - Menu item availability changed (to restaurant room)
 * qr:refreshed   - QR codes refreshed (to restaurant room)
 */
