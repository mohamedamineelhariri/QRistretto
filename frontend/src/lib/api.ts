const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    messageAr?: string;
    messageFr?: string;
    data?: T;
    code?: string;
}

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // QR Token validation
    async validateToken(token: string) {
        return this.request<{
            tableId: string;
            tableNumber: number;
            tableName: string | null;
            restaurantId: string;
            restaurant: {
                id: string;
                name: string;
                nameFr: string | null;
                nameAr: string | null;
            };
        }>(`/qr/validate/${token}`);
    }

    // Menu
    async getMenu(restaurantId: string, locale: string = 'en') {
        return this.request<{
            categories: Array<{
                category: string;
                categoryEn: string;
                categoryFr: string | null;
                categoryAr: string | null;
                items: Array<{
                    id: string;
                    name: string;
                    nameEn: string;
                    nameFr: string | null;
                    nameAr: string | null;
                    description: string | null;
                    price: number;
                    imageUrl: string | null;
                    available: boolean;
                }>;
            }>;
            locale: string;
        }>(`/menu/${restaurantId}?locale=${locale}`);
    }

    // Orders
    async createOrder(data: {
        token: string;
        items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
        notes?: string;
    }) {
        return this.request<{ order: unknown; tableNumber: number }>('/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getOrder(orderId: string) {
        return this.request<{ order: unknown }>(`/orders/${orderId}`);
    }

    async getTableOrders(token: string) {
        return this.request<{ orders: unknown[]; table: unknown }>(`/orders/table/${token}`);
    }

    // Staff - Active orders
    async getActiveOrders() {
        return this.request<{ orders: unknown[] }>('/orders/active/list');
    }

    async updateOrderStatus(orderId: string, status: string) {
        return this.request<{ order: unknown }>(`/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    // Auth
    async login(email: string, password: string) {
        const response = await this.request<{
            token: string;
            restaurant: { id: string; name: string; email: string };
        }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (response.success && response.data?.token) {
            this.setToken(response.data.token);
            localStorage.setItem('admin_token', response.data.token);
        }

        return response;
    }

    async logout() {
        this.setToken(null);
        localStorage.removeItem('admin_token');
        return this.request('/auth/logout', { method: 'POST' });
    }

    async staffLogin(staffId: string, pin: string) {
        return this.request<{
            token: string;
            staff: { id: string; name: string; role: string };
            restaurant: { id: string; name: string };
        }>('/auth/staff-login', {
            method: 'POST',
            body: JSON.stringify({ staffId, pin }),
        });
    }

    // Admin - Dashboard
    async getDashboard() {
        return this.request<{
            todayOrders: number;
            pendingOrders: number;
            totalMenuItems: number;
            totalTables: number;
            todayRevenue: number;
        }>('/admin/dashboard');
    }

    // Admin - Menu CRUD
    async getAllMenuItems() {
        return this.request<{ items: unknown[] }>('/menu/admin/all');
    }

    async createMenuItem(data: unknown) {
        return this.request<{ item: unknown }>('/menu', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateMenuItem(itemId: string, data: unknown) {
        return this.request<{ item: unknown }>(`/menu/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async toggleMenuItem(itemId: string) {
        return this.request<{ item: unknown }>(`/menu/${itemId}/toggle`, {
            method: 'PATCH',
        });
    }

    async deleteMenuItem(itemId: string) {
        return this.request(`/menu/${itemId}`, { method: 'DELETE' });
    }

    // Admin - Tables
    async getTables() {
        return this.request<{ tables: unknown[] }>('/tables');
    }

    async createTable(data: { tableNumber: number; tableName?: string; capacity?: number }) {
        return this.request<{ table: unknown }>('/tables', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async generateQR(tableId: string) {
        return this.request<{
            qrDataUrl: string;
            qrUrl: string;
            token: string;
            expiresAt: string;
            tableNumber: number;
        }>(`/qr/generate/${tableId}`, { method: 'POST' });
    }

    async refreshAllQR() {
        return this.request<{ count: number }>('/qr/refresh-all', { method: 'POST' });
    }

    // Admin - Staff
    async getStaff() {
        return this.request<{ staff: unknown[] }>('/admin/staff');
    }

    async createStaff(data: { name: string; pin: string; role: string }) {
        return this.request<{ staff: unknown }>('/admin/staff', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Admin - WiFi Networks
    async getRestaurant() {
        return this.request<{ restaurant: unknown }>('/admin/restaurant');
    }

    async addWifiNetwork(data: { networkName: string; ipRange: string; networkType?: string }) {
        return this.request<{ network: unknown }>('/admin/wifi-networks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Initialize from localStorage
    init() {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('admin_token');
            if (token) {
                this.setToken(token);
            }
        }
    }
}

export const api = new ApiClient();

// Initialize on import
if (typeof window !== 'undefined') {
    api.init();
}
