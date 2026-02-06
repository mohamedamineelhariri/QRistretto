'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, ChefHat, Bell, Package, XCircle, RefreshCw, Users, Lock, LogOut } from 'lucide-react';
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
    waiterId: string | null; // Added
    waiter?: { name: string }; // Added
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
    const router = useRouter();
    const { t, locale } = useApp();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'my-active' | 'ready'>('pending');
    const [newOrderAlert, setNewOrderAlert] = useState(false);
    const [staffInfo, setStaffInfo] = useState<{ id: string; name: string } | null>(null);

    // Auth Check
    useEffect(() => {
        // Try staff token first
        const staffToken = localStorage.getItem('staff_token');
        const staffData = localStorage.getItem('staff_info');

        if (staffToken && staffData) {
            setStaffInfo(JSON.parse(staffData));
            api.setToken(staffToken);
            fetchOrders();
        } else {
            // Fallback for demo: Check admin token or redirect to login
            const adminToken = localStorage.getItem('admin_token');
            if (adminToken) {
                // If using admin token, we are "Manager" basically.
                api.setToken(adminToken);
                fetchOrders();
            } else {
                router.push('/staff/login');
            }
        }
    }, []);

    useEffect(() => {
        socketClient.connect();

        const unsubNew = socketClient.onNewOrder((data) => {
            setOrders(prev => [data.order as Order, ...prev]);
            setNewOrderAlert(true);
            playNotificationSound();
            setTimeout(() => setNewOrderAlert(false), 3000);
        });

        const unsubUpdate = socketClient.onOrderUpdated((data) => {
            setOrders(prev => prev.map(o =>
                o.id === (data.order as Order).id ? data.order as Order : o
            ));
        });

        // Listen for assignment updates specifically if needed, 
        // but onOrderUpdated handles it if backend sends full object.

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
            if ((error as any).response?.status === 401) {
                router.push('/staff/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await api.updateOrderStatus(orderId, status);
            // Optimistic update
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return { ...o, status, waiterId: staffInfo?.id || o.waiterId, waiter: staffInfo ? { name: staffInfo.name } : o.waiter };
                }
                return o;
            }));
        } catch (error: any) {
            console.error('Failed to update status:', error);
            alert(error.response?.data?.message || 'Failed to update order status');
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('/sounds/notification.mp3'); // We need to add this file or use better synth
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

    const getFilteredOrders = () => {
        switch (filter) {
            case 'pending':
                // Show all pending orders (unassigned)
                return orders.filter(o => o.status === 'PENDING');
            case 'my-active':
                // Show orders I accepted OR orders in prep that I accepted
                // If using admin token (no staffInfo), show all active.
                if (!staffInfo) {
                    return orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status));
                }
                return orders.filter(o =>
                    ['ACCEPTED', 'PREPARING'].includes(o.status) &&
                    (o.waiterId === staffInfo.id)
                );
            case 'ready':
                // Show ready orders. Ideally nicely highlighted if assigned to me.
                return orders.filter(o => o.status === 'READY');
            default:
                return orders;
        }
    };

    // Count logic
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const myActiveCount = staffInfo
        ? orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status) && o.waiterId === staffInfo.id).length
        : orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status)).length;

    const readyCount = orders.filter(o => o.status === 'READY').length;
    const myReadyCount = staffInfo
        ? orders.filter(o => o.status === 'READY' && o.waiterId === staffInfo.id).length
        : readyCount;

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
        <div className="min-h-screen pb-20">
            {/* New Order Alert */}
            {newOrderAlert && (
                <div className="fixed top-4 left-4 right-4 z-50 bg-accent text-white p-4 rounded-xl shadow-strong animate-slide-up cursor-pointer" onClick={() => setFilter('pending')}>
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
                        <div>
                            <h1 className="text-lg font-bold leading-none">{t('staff.waiter')}</h1>
                            {staffInfo && <span className="text-xs text-light-muted">Hi, {staffInfo.name}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchOrders}
                            className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('staff_token');
                                localStorage.removeItem('staff_info');
                                router.push('/staff/login');
                            }}
                            className="p-2 rounded-full hover:bg-red-500/10 text-red-500"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex px-4 pb-3 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`flex-1 py-3 px-2 rounded-xl font-medium flex-col sm:flex-row flex items-center justify-center gap-1 transition-colors min-w-[80px] ${filter === 'pending'
                            ? 'bg-status-pending text-white'
                            : 'bg-light-card dark:bg-dark-card'
                            }`}
                    >
                        <Clock className="w-5 h-5" />
                        <span className="text-sm">Pending</span>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">{pendingCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilter('my-active')}
                        className={`flex-1 py-3 px-2 rounded-xl font-medium flex-col sm:flex-row flex items-center justify-center gap-1 transition-colors min-w-[80px] ${filter === 'my-active'
                            ? 'bg-status-preparing text-white'
                            : 'bg-light-card dark:bg-dark-card'
                            }`}
                    >
                        <ChefHat className="w-5 h-5" />
                        <span className="text-sm">My Orders</span>
                        {myActiveCount > 0 && (
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">{myActiveCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilter('ready')}
                        className={`flex-1 py-3 px-2 rounded-xl font-medium flex-col sm:flex-row flex items-center justify-center gap-1 transition-colors min-w-[80px] ${filter === 'ready'
                            ? 'bg-status-ready text-white'
                            : 'bg-light-card dark:bg-dark-card'
                            }`}
                    >
                        <Bell className="w-5 h-5" />
                        <span className="text-sm">Ready</span>
                        {readyCount > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${myReadyCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20'}`}>
                                {readyCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Orders */}
            <main className="p-4">
                {getFilteredOrders().length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 text-light-muted dark:text-dark-muted opacity-50" />
                        <p className="text-light-muted dark:text-dark-muted">
                            {filter === 'my-active' ? 'You have no active orders.' : t('staff.noOrders')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {getFilteredOrders().map((order) => {
                            const status = statusConfig[order.status as keyof typeof statusConfig];
                            const StatusIcon = status.icon;
                            const isAssignedToMe = Boolean(staffInfo && order.waiterId === staffInfo.id);
                            const isAssignedToOther = Boolean(staffInfo && order.waiterId && order.waiterId !== staffInfo.id);

                            // If filtered to "Ready", but I'm not the owner, maybe show it differently?
                            // For now, simpler is better.

                            return (
                                <div key={order.id} className={`card overflow-hidden border-2 ${order.status === 'READY' && isAssignedToMe ? 'border-status-ready animate-pulse-soft' : 'border-transparent'}`}>
                                    {/* Order header */}
                                    <div className={`${status.bg} px-4 py-3 flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-bold">T{order.table.tableNumber}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">#{order.orderNumber}</span>
                                                    {order.waiter && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-black/10 rounded-full flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {isAssignedToMe ? 'Me' : order.waiter.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-light-muted dark:text-dark-muted">
                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 ${status.color}`}>
                                            <StatusIcon className="w-5 h-5" />
                                            <span className="font-medium text-sm">{status.label}</span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="p-4">
                                        <ul className="space-y-1 mb-4">
                                            {order.items.map((item) => (
                                                <li key={item.id} className="flex justify-between text-sm">
                                                    <span>
                                                        <span className="font-bold">{item.quantity}×</span> {getItemName(item)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Notes */}
                                        {order.notes && (
                                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-2 rounded-lg text-xs mb-3">
                                                Note: {order.notes}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border mb-4">
                                            <span className="font-medium text-sm">Total</span>
                                            <span className="font-bold text-accent">{parseFloat(order.totalAmount).toFixed(2)} DH</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {order.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => updateStatus(order.id, 'ACCEPTED')}
                                                        className="flex-1 btn-primary py-3 text-sm"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        {t('staff.accept')}
                                                    </button>

                                                    {/* Only managers can cancel? Or waiter can too. */}
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Cancel this order?')) updateStatus(order.id, 'CANCELLED')
                                                        }}
                                                        className="px-3 py-3 rounded-lg bg-status-cancelled/10 text-status-cancelled hover:bg-status-cancelled/20"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}

                                            {/* PREPARING: Wait for Kitchen */}
                                            {order.status === 'PREPARING' && (
                                                <div className="w-full py-2 text-center text-status-preparing bg-status-preparing/5 rounded-lg text-sm font-medium animate-pulse">
                                                    Cooking...
                                                </div>
                                            )}

                                            {/* READY: Deliver */}
                                            {order.status === 'READY' && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'DELIVERED')}
                                                    disabled={isAssignedToOther} // Disable if assigned to someone else
                                                    className={`flex-1 btn-primary py-3 text-sm ${isAssignedToOther ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                                >
                                                    <Package className="w-4 h-4 mr-2" />
                                                    {isAssignedToOther ? `Assigned to ${order.waiter?.name}` : t('staff.deliver')}
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
