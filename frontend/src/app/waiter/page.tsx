'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, ChefHat, Bell, Package, RefreshCw, Users, Volume2, VolumeX, LogOut, RotateCcw, AlertTriangle, UserCheck, History, X } from 'lucide-react';
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
    waiterId: string | null;
    waiter?: { name: string };
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

// Internal component for real-time timer
function OrderTimer({ createdAt }: { createdAt: string }) {
    const [elapsed, setElapsed] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const created = new Date(createdAt).getTime();
            const diff = now - created;

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);

            setElapsed(`${mins}m ${secs}s`);
            setIsUrgent(mins >= 20);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    return (
        <div className={`flex items-center gap-1 font-mono font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-dark-muted'}`}>
            <Clock className="w-4 h-4" />
            <span>{elapsed}</span>
            {isUrgent && <AlertTriangle className="w-4 h-4" />}
        </div>
    );
}

const statusColors = {
    PENDING: 'bg-status-pending',
    ACCEPTED: 'bg-status-accepted',
    PREPARING: 'bg-status-preparing',
    READY: 'bg-status-ready',
    DELIVERED: 'bg-status-delivered',
};

export default function WaiterPage() {
    const router = useRouter();
    const { t, locale } = useApp();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'my-active' | 'ready'>('pending');
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [staffInfo, setStaffInfo] = useState<{ id: string; name: string } | null>(null);
    const [newOrderAlert, setNewOrderAlert] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Auth Check
    useEffect(() => {
        const staffToken = localStorage.getItem('staff_token');
        const staffData = localStorage.getItem('staff_info');
        const adminToken = localStorage.getItem('admin_token');

        if (staffToken && staffData) {
            setStaffInfo(JSON.parse(staffData));
            api.setToken(staffToken);
            fetchOrders();
        } else if (adminToken) {
            // Admin acting as waiter
            api.setToken(adminToken);
            fetchOrders();
        } else {
            router.push('/staff/login');
        }
    }, [router]);

    const fetchOrders = async () => {
        try {
            const response = await api.getActiveOrders();
            if (response.success && response.data) {
                setOrders(response.data.orders as Order[]);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            if ((error as any).status === 401) {
                router.push('/staff/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        // Optimistic Update
        setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    status,
                    waiterId: status === 'ACCEPTED' ? staffInfo?.id || o.waiterId : o.waiterId
                };
            }
            return o;
        }));

        try {
            await api.updateOrderStatus(orderId, status);
        } catch (error: any) {
            console.error('Failed to update status:', error);
            // Revert on failure (optional, but good practice)
            fetchOrders();
        }
    };

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const res = await api.getOrderHistory(50, 0, staffInfo?.id);
            if (res.success && res.data) {
                setHistoryOrders(res.data.orders);
            }
        } catch (error) {
            console.error('Fetch history error:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleToggleHistory = () => {
        if (!isHistoryOpen) {
            fetchHistory();
        }
        setIsHistoryOpen(!isHistoryOpen);
    };

    const playOrderSound = () => {
        if (isMuted) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playNote = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            playNote(660, ctx.currentTime, 0.5);
            playNote(523, ctx.currentTime + 0.3, 0.8);
        } catch (e) { }
    };

    const playReadySound = () => {
        if (isMuted) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playNote = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            playNote(880, ctx.currentTime, 0.1);
            playNote(880, ctx.currentTime + 0.2, 0.1);
        } catch (e) { }
    };

    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const staffData = localStorage.getItem('staff_info');
        const adminData = localStorage.getItem('admin_info');
        const rId = staffData ? JSON.parse(staffData).restaurantId : (adminData ? JSON.parse(adminData).id : null);

        if (rId) {
            setRestaurantId(rId);
            socketClient.connect();

            // Initial Join
            socketClient.joinRestaurant(rId);

            // Listen for connection changes
            const unsubConnection = socketClient.onConnectionChange((connected) => {
                setIsConnected(connected);
                if (connected) {
                    // Re-join on reconnect
                    console.log('🔄 Reconnected, joining room:', rId);
                    socketClient.joinRestaurant(rId);
                    fetchOrders(); // Refresh data on reconnect
                }
            });

            const unsubNew = socketClient.onNewOrder((data) => {
                setOrders(prev => [data.order as Order, ...prev]);
                setNewOrderAlert(true);
                playOrderSound();
            });

            const unsubUpdate = socketClient.onOrderUpdated((data) => {
                const updatedOrder = data.order as Order;
                setOrders(prev => prev.map(o =>
                    o.id === updatedOrder.id ? updatedOrder : o
                ));

                // If my order is ready
                if (updatedOrder.status === 'READY' && (!updatedOrder.waiterId || updatedOrder.waiterId === staffInfo?.id)) {
                    playReadySound();
                }
            });

            return () => {
                unsubConnection();
                unsubNew();
                unsubUpdate();
                socketClient.leaveRestaurant(rId);
            };
        }
    }, [restaurantId, isMuted, staffInfo]);

    const getItemName = (item: Order['items'][0]) => {
        if (locale === 'fr' && item.menuItem.nameFr) return item.menuItem.nameFr;
        if (locale === 'ar' && item.menuItem.nameAr) return item.menuItem.nameAr;
        return item.menuItem.name;
    };

    const getFilteredOrders = () => {
        switch (filter) {
            case 'pending':
                return orders.filter(o => o.status === 'PENDING');
            case 'my-active':
                if (!staffInfo) return orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status));
                return orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status) && o.waiterId === staffInfo.id);
            case 'ready':
                // Show ALL ready orders, but maybe highlight mine
                return orders.filter(o => o.status === 'READY');
            default:
                return orders;
        }
    };

    const activeOrders = getFilteredOrders();

    // Counts
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const readyCount = orders.filter(o => o.status === 'READY').length;

    const handleLogout = () => {
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_info');
        router.push('/staff/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-bg text-dark-text">
                <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-accent animate-pulse" />
                    <p>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-bg text-dark-text pb-6">
            {/* New Order Alert */}
            {newOrderAlert && (
                <div
                    className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-accent text-white px-6 py-3 rounded-full shadow-strong animate-slide-up cursor-pointer flex items-center gap-2"
                    onClick={() => { setFilter('pending'); setNewOrderAlert(false); }}
                >
                    <Bell className="w-5 h-5 animate-shake" />
                    <span className="font-bold">New Order!</span>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 bg-dark-card border-b border-dark-border shadow-md">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                            <Users className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-none">{t('staff.waiter')}</h1>
                            <div className="flex items-center gap-2">
                                {staffInfo && <p className="text-xs text-dark-muted mt-0.5">Hi, {staffInfo.name}</p>}
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isConnected
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    {isConnected ? 'LIVE' : 'OFFLINE'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-2 rounded-full transition-colors ${isMuted ? 'text-red-400 bg-red-400/10' : 'text-dark-muted hover:bg-dark-border'}`}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleToggleHistory}
                            className="p-2 rounded-full text-dark-muted hover:bg-dark-border transition-colors group"
                            title="History"
                        >
                            <History className="w-5 h-5 group-hover:rotate-[-10deg] transition-transform" />
                        </button>
                        <button
                            onClick={fetchOrders}
                            className="p-2 rounded-full text-dark-muted hover:bg-dark-border transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex px-4 pb-3 gap-2 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border ${filter === 'pending'
                            ? 'bg-status-pending text-white border-status-pending shadow-lg shadow-status-pending/20'
                            : 'bg-dark-bg text-dark-muted border-dark-border'
                            }`}
                    >
                        <span>New</span>
                        {pendingCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{pendingCount}</span>}
                    </button>

                    <button
                        onClick={() => setFilter('my-active')}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border ${filter === 'my-active'
                            ? 'bg-status-accepted text-white border-status-accepted shadow-lg shadow-status-accepted/20'
                            : 'bg-dark-bg text-dark-muted border-dark-border'
                            }`}
                    >
                        <span>My Orders</span>
                    </button>

                    <button
                        onClick={() => setFilter('ready')}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border ${filter === 'ready'
                            ? 'bg-status-ready text-white border-status-ready shadow-lg shadow-status-ready/20'
                            : 'bg-dark-bg text-dark-muted border-dark-border'
                            }`}
                    >
                        <span>Ready</span>
                        {readyCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{readyCount}</span>}
                    </button>
                </div>
            </header>

            {/* Orders Grid */}
            <main className="p-4">
                {activeOrders.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Users className="w-24 h-24 mx-auto mb-4 text-dark-border" />
                        <h2 className="text-2xl font-bold text-dark-muted">{t('staff.noOrders')}</h2>
                        <p className="text-dark-muted">Good job, {staffInfo?.name || 'Waiter'}!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {activeOrders.map((order) => {
                            // Waiter Actions Logic
                            const isMine = order.waiterId === staffInfo?.id;
                            let action = null;
                            let undo = null;

                            if (order.status === 'PENDING') {
                                action = { label: 'Accept', status: 'ACCEPTED', icon: UserCheck, color: 'bg-status-accepted' };
                            } else if (order.status === 'ACCEPTED' && isMine) {
                                // Waiting for kitchen...
                                undo = { label: 'Undo', status: 'PENDING' };
                            } else if (order.status === 'READY') {
                                action = { label: 'Deliver', status: 'DELIVERED', icon: Package, color: 'bg-accent' };
                            } else if (order.status === 'DELIVERED' && isMine) {
                                undo = { label: 'Undo', status: 'READY' };
                                // Note: DELIVERED usually disappears from view, but if we showed history, we could undo.
                                // In 'my-active' view, DELIVERED is not shown. 
                                // So undo delivered is only possible if we view history, which we don't here.
                            }

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-dark-card rounded-xl overflow-hidden border-2 flex flex-col shadow-lg transition-all ${order.status === 'READY' ? 'border-status-ready shadow-status-ready/20' : 'border-dark-border hover:border-dark-muted'
                                        }`}
                                >
                                    {/* Order Header */}
                                    <div className={`${statusColors[order.status as keyof typeof statusColors]} text-white px-4 py-3 flex justify-between items-start`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-3xl font-black tracking-tight">#{order.orderNumber}</span>
                                                <span className="bg-black/20 px-2 py-0.5 rounded text-sm font-medium backdrop-blur-sm">
                                                    Table {order.table.tableNumber}
                                                </span>
                                            </div>
                                            {order.waiter && (
                                                <div className="text-xs opacity-90 mt-1 flex items-center gap-1">
                                                    <UserCheck className="w-3 h-3" />
                                                    {order.waiter.name}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                                            <OrderTimer createdAt={order.createdAt} />
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="p-4 flex-grow">
                                        <ul className="space-y-3">
                                            {order.items.map((item) => (
                                                <li key={item.id} className="flex items-start gap-3">
                                                    <div className="bg-dark-bg w-8 h-8 flex items-center justify-center rounded-lg font-bold text-accent shrink-0 border border-dark-border">
                                                        {item.quantity}
                                                    </div>
                                                    <div className="pt-0.5">
                                                        <span className="font-semibold text-lg leading-tight block">{getItemName(item)}</span>
                                                        {item.notes && (
                                                            <div className="text-red-400 text-sm font-medium mt-1 flex items-start gap-1">
                                                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                                                <span>{item.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        {order.notes && (
                                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
                                                <strong className="block text-red-400 text-xs uppercase tracking-wider mb-1">Kitchen Note:</strong>
                                                {order.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Footer */}
                                    {(action || undo) && (
                                        <div className="p-3 bg-dark-bg/50 border-t border-dark-border grid grid-cols-[auto_1fr] gap-2">
                                            {undo ? (
                                                <button
                                                    onClick={() => updateStatus(order.id, undo.status)}
                                                    className="w-12 h-12 flex items-center justify-center rounded-lg bg-dark-card hover:bg-dark-border text-dark-muted hover:text-white transition-colors border border-dark-border"
                                                    title={undo.label}
                                                >
                                                    <RotateCcw className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <div className="w-0"></div> // Spacer logic if no undo
                                            )}

                                            {action && (
                                                <button
                                                    onClick={() => updateStatus(order.id, action.status)}
                                                    className={`h-12 rounded-lg font-bold text-lg flex items-center justify-center gap-2 text-white shadow-lg transition-transform active:scale-[0.98] ${action.color} hover:brightness-110`}
                                                >
                                                    <action.icon className="w-5 h-5" />
                                                    {action.label}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
            {/* Order History Modal */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-card w-full max-w-2xl max-h-[80vh] rounded-2xl border border-dark-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-bg/50">
                            <div className="flex items-center gap-2 text-dark-muted">
                                <History className="w-5 h-5" />
                                <h3 className="font-bold text-lg">My Order History</h3>
                            </div>
                            <button
                                onClick={() => setIsHistoryOpen(false)}
                                className="p-2 rounded-lg hover:bg-dark-border text-dark-muted transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-dark-border">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                                    <p className="text-dark-muted font-medium">Loading history...</p>
                                </div>
                            ) : historyOrders.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <Package className="w-16 h-16 mx-auto mb-4 text-dark-border" />
                                    <p className="text-dark-muted font-bold text-lg">No historic orders found</p>
                                    <p className="text-sm">Completed orders will appear here.</p>
                                </div>
                            ) : (
                                historyOrders.map((order) => (
                                    <div key={order.id} className="bg-dark-bg/40 border border-dark-border/60 rounded-xl p-4 flex flex-col gap-3 hover:border-dark-muted transition-colors shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-black text-dark-muted tracking-tight">#{order.orderNumber}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold bg-dark-card px-2 py-0.5 rounded border border-dark-border w-fit text-accent">
                                                        Table {order.table.tableNumber}
                                                    </span>
                                                    <span className="text-[10px] text-dark-muted mt-1 uppercase font-bold tracking-wider">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {order.status}
                                            </div>
                                        </div>

                                        <div className="bg-dark-card/50 p-3 rounded-lg border border-dark-border/40">
                                            <ul className="space-y-1">
                                                {order.items.map((item) => (
                                                    <li key={item.id} className="text-sm flex justify-between">
                                                        <span className="text-dark-muted font-medium">
                                                            <span className="text-accent font-bold mr-2">{item.quantity}x</span>
                                                            {getItemName(item)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-dark-border/30">
                                            <span className="text-dark-muted uppercase tracking-wider">Total Amount</span>
                                            <span className="text-accent text-sm font-black">{order.totalAmount} DH</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
