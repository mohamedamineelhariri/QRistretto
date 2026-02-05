'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle, ChefHat, Bell, Package, XCircle, RefreshCw, Users } from 'lucide-react';
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
        unitPrice: string;
        notes: string | null;
        menuItem: {
            name: string;
            nameFr: string | null;
            nameAr: string | null;
        };
    }>;
}

const statusConfig = {
    PENDING: { icon: Clock, color: 'text-status-pending', bg: 'bg-status-pending/10', label: 'Pending' },
    ACCEPTED: { icon: CheckCircle, color: 'text-status-accepted', bg: 'bg-status-accepted/10', label: 'Accepted' },
    PREPARING: { icon: ChefHat, color: 'text-status-preparing', bg: 'bg-status-preparing/10', label: 'Preparing' },
    READY: { icon: Bell, color: 'text-status-ready', bg: 'bg-status-ready/10', label: 'Ready' },
    DELIVERED: { icon: Package, color: 'text-status-delivered', bg: 'bg-status-delivered/10', label: 'Delivered' },
    CANCELLED: { icon: XCircle, color: 'text-status-cancelled', bg: 'bg-status-cancelled/10', label: 'Cancelled' },
};

export default function WaiterPage() {
    const { t, locale } = useApp();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'active' | 'ready'>('pending');
    const [newOrderAlert, setNewOrderAlert] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            api.setToken(token);
            fetchOrders();
        }
    }, []);

    useEffect(() => {
        socketClient.connect();

        const unsubNew = socketClient.onNewOrder((data) => {
            setOrders(prev => [data.order as Order, ...prev]);
            setNewOrderAlert(true);
            playNotificationSound();
            // Auto-hide alert after 3s
            setTimeout(() => setNewOrderAlert(false), 3000);
        });

        const unsubUpdate = socketClient.onOrderUpdated((data) => {
            setOrders(prev => prev.map(o =>
                o.id === (data.order as Order).id ? data.order as Order : o
            ));
        });

        return () => {
            unsubNew();
            unsubUpdate();
        };
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.getActiveOrders();
            if (response.success && response.data) {
                setOrders(response.data.orders as Order[]);
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
            alert('Failed to update order status');
        }
    };

    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = 600;
            oscillator.connect(audioContext.destination);
            oscillator.start();
            setTimeout(() => oscillator.stop(), 150);
            setTimeout(() => {
                oscillator.start();
                setTimeout(() => oscillator.stop(), 150);
            }, 200);
        } catch (e) { }
    };

    const getItemName = (item: Order['items'][0]) => {
        if (locale === 'fr' && item.menuItem.nameFr) return item.menuItem.nameFr;
        if (locale === 'ar' && item.menuItem.nameAr) return item.menuItem.nameAr;
        return item.menuItem.name;
    };

    const getFilteredOrders = () => {
        switch (filter) {
            case 'pending':
                return orders.filter(o => o.status === 'PENDING');
            case 'active':
                return orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status));
            case 'ready':
                return orders.filter(o => o.status === 'READY');
            default:
                return orders;
        }
    };

    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const readyCount = orders.filter(o => o.status === 'READY').length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-accent animate-pulse" />
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* New Order Alert */}
            {newOrderAlert && (
                <div className="fixed top-4 left-4 right-4 z-50 bg-accent text-white p-4 rounded-xl shadow-strong animate-slide-up">
                    <div className="flex items-center gap-3">
                        <Bell className="w-6 h-6 animate-shake" />
                        <span className="font-bold">New order received!</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border safe-area-top">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-accent" />
                        <h1 className="text-xl font-bold">{t('staff.waiter')}</h1>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex px-4 pb-3 gap-2">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${filter === 'pending'
                                ? 'bg-status-pending text-white'
                                : 'bg-light-card dark:bg-dark-card'
                            }`}
                    >
                        <Clock className="w-5 h-5" />
                        Pending
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">{pendingCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${filter === 'active'
                                ? 'bg-status-preparing text-white'
                                : 'bg-light-card dark:bg-dark-card'
                            }`}
                    >
                        <ChefHat className="w-5 h-5" />
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('ready')}
                        className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${filter === 'ready'
                                ? 'bg-status-ready text-white'
                                : 'bg-light-card dark:bg-dark-card'
                            }`}
                    >
                        <Bell className="w-5 h-5" />
                        Ready
                        {readyCount > 0 && (
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">{readyCount}</span>
                        )}
                    </button>
                </div>
            </header>

            {/* Orders */}
            <main className="p-4">
                {getFilteredOrders().length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 text-light-muted dark:text-dark-muted opacity-50" />
                        <p className="text-light-muted dark:text-dark-muted">{t('staff.noOrders')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {getFilteredOrders().map((order) => {
                            const status = statusConfig[order.status as keyof typeof statusConfig];
                            const StatusIcon = status.icon;

                            return (
                                <div key={order.id} className="card overflow-hidden">
                                    {/* Order header */}
                                    <div className={`${status.bg} px-4 py-3 flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl font-bold">T{order.table.tableNumber}</span>
                                            <div>
                                                <span className="font-medium">Order #{order.orderNumber}</span>
                                                <p className="text-sm text-light-muted dark:text-dark-muted">
                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 ${status.color}`}>
                                            <StatusIcon className="w-5 h-5" />
                                            <span className="font-medium">{status.label}</span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="p-4">
                                        <ul className="space-y-1 mb-4">
                                            {order.items.map((item) => (
                                                <li key={item.id} className="flex justify-between">
                                                    <span>
                                                        <span className="font-medium">{item.quantity}×</span> {getItemName(item)}
                                                    </span>
                                                    <span className="text-light-muted dark:text-dark-muted">
                                                        {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} DH
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border mb-4">
                                            <span className="font-medium">Total</span>
                                            <span className="font-bold text-accent">{parseFloat(order.totalAmount).toFixed(2)} DH</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {order.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'ACCEPTED')}
                                                        className="flex-1 btn-primary"
                                                    >
                                                        <CheckCircle className="w-5 h-5 mr-2" />
                                                        {t('staff.accept')}
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'CANCELLED')}
                                                        className="px-4 py-3 rounded-lg bg-status-cancelled/10 text-status-cancelled font-medium"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            {order.status === 'READY' && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'DELIVERED')}
                                                    className="flex-1 btn-primary"
                                                >
                                                    <Package className="w-5 h-5 mr-2" />
                                                    {t('staff.deliver')}
                                                </button>
                                            )}
                                        </div>
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
