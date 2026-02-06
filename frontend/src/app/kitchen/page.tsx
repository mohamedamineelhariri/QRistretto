'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle, ChefHat, Bell, Package, RefreshCw, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import { useApp } from '../providers';

interface Order {
    id: string;
    orderNumber: number;
    status: string;
    totalAmount: string;
    notes: string | null;
    createdAt: string;
    table: {
        tableNumber: number;
        tableName: string | null;
    };
    items: Array<{
        id: string;
        quantity: number;
        notes: string | null;
        menuItem: {
            name: string;
            nameFr: string | null;
            nameAr: string | null;
        };
    }>;
}

const statusColors = {
    PENDING: 'bg-status-pending',
    ACCEPTED: 'bg-status-accepted',
    PREPARING: 'bg-status-preparing',
    READY: 'bg-status-ready',
    DELIVERED: 'bg-status-delivered',
};

export default function KitchenPage() {
    const { t, locale } = useApp();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'ACCEPTED' | 'PREPARING' | 'READY'>('all');
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        // Get token from URL or localStorage
        const token = localStorage.getItem('admin_token');
        if (token) {
            api.setToken(token);
            fetchOrders();
        }
    }, []);

    useEffect(() => {
        if (restaurantId) {
            socketClient.connect();
            socketClient.joinRestaurant(restaurantId);

            const unsubNew = socketClient.onNewOrder((data) => {
                setOrders(prev => [data.order as Order, ...prev]);
                // Play notification sound
                playNotificationSound();
            });

            const unsubUpdate = socketClient.onOrderUpdated((data) => {
                setOrders(prev => prev.map(o =>
                    o.id === (data.order as Order).id ? data.order as Order : o
                ));
            });

            return () => {
                unsubNew();
                unsubUpdate();
                socketClient.leaveRestaurant(restaurantId);
            };
        }
    }, [restaurantId]);

    const fetchOrders = async () => {
        try {
            const response = await api.getActiveOrders();
            if (response.success && response.data) {
                setOrders(response.data.orders as Order[]);
                // Get restaurant ID from first order or dashboard
                if ((response.data.orders as Order[]).length > 0) {
                    // Join socket room
                    const dashRes = await api.getDashboard();
                    // We'll get restaurant ID from the response context
                }
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await api.updateOrderStatus(orderId, status);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('/sounds/notification.mp3');
        // Fallback synth
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);

            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.setValueAtTime(800, ctx.currentTime);
                gain2.gain.setValueAtTime(0.1, ctx.currentTime); // volume
                osc2.start();
                osc2.stop(ctx.currentTime + 0.4);
            }, 250);
        } catch (e) { }
    };

    const getItemName = (item: Order['items'][0]) => {
        if (locale === 'fr' && item.menuItem.nameFr) return item.menuItem.nameFr;
        if (locale === 'ar' && item.menuItem.nameAr) return item.menuItem.nameAr;
        return item.menuItem.name;
    };

    const filteredOrders = filter === 'all'
        ? orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
        : orders.filter(o => o.status === filter);

    const getNextAction = (status: string) => {
        switch (status) {
            case 'ACCEPTED':
                return { label: t('staff.prepare'), nextStatus: 'PREPARING', icon: ChefHat };
            case 'PREPARING':
                return { label: t('staff.ready'), nextStatus: 'READY', icon: Bell };
            case 'READY':
                return { label: t('staff.deliver'), nextStatus: 'DELIVERED', icon: Package };
            default:
                return null;
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getTimeSince = (dateStr: string) => {
        const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
        if (mins < 1) return 'Just now';
        if (mins === 1) return '1 min ago';
        return `${mins} mins ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-bg text-dark-text">
                <div className="text-center">
                    <ChefHat className="w-12 h-12 mx-auto mb-4 text-accent animate-pulse" />
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-bg text-dark-text">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-dark-card border-b border-dark-border">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChefHat className="w-6 h-6 text-accent" />
                        <h1 className="text-xl font-bold">{t('staff.kitchen')}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-dark-muted">
                            {orders.filter(o => o.status === 'PREPARING').length} preparing
                        </span>
                        <button
                            onClick={fetchOrders}
                            className="p-2 rounded-full hover:bg-dark-border"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex px-4 pb-3 gap-2 overflow-x-auto">
                    {(['all', 'ACCEPTED', 'PREPARING', 'READY'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f
                                ? 'bg-accent text-white'
                                : 'bg-dark-border text-dark-muted'
                                }`}
                        >
                            {f === 'all' ? 'All Active' : f.charAt(0) + f.slice(1).toLowerCase()}
                            {f !== 'all' && (
                                <span className="ml-1">
                                    ({orders.filter(o => o.status === f).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </header>

            {/* Orders Grid */}
            <main className="p-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <ChefHat className="w-16 h-16 mx-auto mb-4 text-dark-muted" />
                        <p className="text-dark-muted">{t('staff.noOrders')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredOrders.map((order) => {
                            const action = getNextAction(order.status);

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-dark-card rounded-xl overflow-hidden border-2 ${order.status === 'READY' ? 'border-status-ready animate-pulse-soft' : 'border-dark-border'
                                        }`}
                                >
                                    {/* Order Header */}
                                    <div className={`${statusColors[order.status as keyof typeof statusColors]} text-white px-4 py-3`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-2xl font-bold">#{order.orderNumber}</span>
                                                <span className="ml-3 text-lg opacity-90">
                                                    Table {order.table.tableNumber}
                                                </span>
                                            </div>
                                            <span className="text-sm opacity-75">
                                                {getTimeSince(order.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="p-4">
                                        <ul className="space-y-2 mb-4">
                                            {order.items.map((item) => (
                                                <li key={item.id} className="flex items-start gap-2">
                                                    <span className="font-bold text-lg text-accent min-w-[28px]">
                                                        {item.quantity}×
                                                    </span>
                                                    <div>
                                                        <span className="font-medium">{getItemName(item)}</span>
                                                        {item.notes && (
                                                            <p className="text-sm text-status-pending mt-0.5">
                                                                ⚠️ {item.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        {order.notes && (
                                            <div className="mb-4 p-3 bg-dark-border rounded-lg text-sm">
                                                <strong>Order Note:</strong> {order.notes}
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        {action && (
                                            <button
                                                onClick={() => updateStatus(order.id, action.nextStatus)}
                                                className="w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 bg-accent text-white hover:bg-accent-hover transition-colors"
                                            >
                                                <action.icon className="w-6 h-6" />
                                                {action.label}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
