import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketClient {
    private socket: Socket | null = null;
    private restaurantId: string | null = null;

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected');

            // Rejoin room if was previously joined
            if (this.restaurantId) {
                this.joinRestaurant(this.restaurantId);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Join restaurant room (for staff dashboards)
    joinRestaurant(restaurantId: string) {
        this.restaurantId = restaurantId;
        this.socket?.emit('join:restaurant', restaurantId);
    }

    leaveRestaurant(restaurantId: string) {
        this.socket?.emit('leave:restaurant', restaurantId);
        this.restaurantId = null;
    }

    // Join order room (for customer tracking)
    joinOrder(orderId: string) {
        this.socket?.emit('join:order', orderId);
    }

    leaveOrder(orderId: string) {
        this.socket?.emit('leave:order', orderId);
    }

    // Event listeners
    onNewOrder(callback: (data: { order: unknown; tableNumber: number }) => void) {
        this.socket?.on('order:new', callback);
        return () => this.socket?.off('order:new', callback);
    }

    onOrderUpdated(callback: (data: { order: unknown }) => void) {
        this.socket?.on('order:updated', callback);
        return () => this.socket?.off('order:updated', callback);
    }

    onOrderStatus(callback: (data: { orderId: string; status: string; updatedAt: string }) => void) {
        this.socket?.on('order:status', callback);
        return () => this.socket?.off('order:status', callback);
    }

    onMenuUpdated(callback: (data: { itemId: string; available: boolean }) => void) {
        this.socket?.on('menu:updated', callback);
        return () => this.socket?.off('menu:updated', callback);
    }

    onQRRefreshed(callback: (data: { message: string; count: number }) => void) {
        this.socket?.on('qr:refreshed', callback);
        return () => this.socket?.off('qr:refreshed', callback);
    }

    onTableUpdated(callback: (data: { tableId: string }) => void) {
        this.socket?.on('table:updated', callback);
        return () => this.socket?.off('table:updated', callback);
    }
}

export const socketClient = new SocketClient();
