import { io, Socket } from 'socket.io-client';


const SOCKET_URL = 'https://1199-160-177-249-126.ngrok-free.app';

class SocketClient {
    private socket: Socket | null = null;
    private restaurantId: string | null = null;
    private isConnected: boolean = false;
    private connectionListeners: ((isConnected: boolean) => void)[] = [];

    connect() {
        console.log('🔌 [SOCKET] connect() called');
        console.log('🔌 [SOCKET] Current socket state:', this.socket?.connected);

        if (this.socket?.connected) {
            console.log('🔌 [SOCKET] Already connected, skipping');
            return;
        }

        console.log('🔌 [SOCKET] Creating new socket connection to:', SOCKET_URL);

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            extraHeaders: {
                'ngrok-skip-browser-warning': 'true'
            }
        });


        console.log('🔌 [SOCKET] Socket instance created, attaching event listeners');

        this.socket.on('connect', () => {
            console.log('✅ [SOCKET] Successfully connected! Socket ID:', this.socket?.id);
            this.isConnected = true;
            this.notifyConnectionChange(true);

            // Rejoin room if was previously joined
            if (this.restaurantId) {
                console.log('🔄 [SOCKET] Re-joining restaurant room:', this.restaurantId);
                this.joinRestaurant(this.restaurantId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ [SOCKET] Disconnected. Reason:', reason);
            this.isConnected = false;
            this.notifyConnectionChange(false);
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('❌ [SOCKET] Connection error:', error);
            console.error('❌ [SOCKET] Error message:', error.message);
            console.error('❌ [SOCKET] Error type:', error.type);
            this.isConnected = false;
            this.notifyConnectionChange(false);
        });

        console.log('🔌 [SOCKET] Event listeners attached, waiting for connection...');
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.notifyConnectionChange(false);
        }
    }

    // Join restaurant room (for staff dashboards)
    joinRestaurant(restaurantId: string) {
        if (!restaurantId) return;
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

    // Connection Status Helpers
    onConnectionChange(callback: (isConnected: boolean) => void) {
        this.connectionListeners.push(callback);
        // Immediately notify current state
        callback(this.isConnected);
        return () => {
            this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
        };
    }

    private notifyConnectionChange(isConnected: boolean) {
        this.connectionListeners.forEach(cb => cb(isConnected));
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
