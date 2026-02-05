'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Search,
    RefreshCw,
    Clock,
    CheckCircle,
    ChefHat,
    Bell,
    Package,
    XCircle,
    Eye,
    Calendar,
    DollarSign
} from 'lucide-react';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import { useApp } from '../../providers';

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
        menuItem: {
            name: string;
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

export default function AdminOrdersPage() {
    const router = useRouter();
    const { t, isRTL } = useApp();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchOrders();

        socketClient.connect();
        const unsub = socketClient.onOrderUpdated(() => {
            fetchOrders();
        });

        return () => unsub();
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

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderNumber.toString().includes(searchQuery) ||
            order.table.tableNumber.toString().includes(searchQuery);
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const totalRevenue = orders
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

    return (
        <div className="min-h-screen pb-20">
            <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="p-2 -ml-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                        >
                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </button>
                        <h1 className="text-xl font-bold">History & Orders</h1>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-4 pb-3 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-muted" />
                        <input
                            type="text"
                            placeholder="Search by order or table #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {['all', ...Object.keys(statusConfig)].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${filterStatus === status
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-light-card dark:bg-dark-card border-light-border dark:border-dark-border text-light-muted'
                                    }`}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-2 text-light-muted mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Active Orders</span>
                        </div>
                        <p className="text-xl font-bold">{orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length}</p>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-2 text-accent mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase">Delivered Value</span>
                        </div>
                        <p className="text-xl font-bold">{totalRevenue.toFixed(2)} DH</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 mx-auto animate-spin text-accent" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 card">
                        <p className="text-light-muted">No orders found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map((order) => {
                            const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                            const StatusIcon = status.icon;

                            return (
                                <div key={order.id} className="card p-4 hover:shadow-medium transition-shadow cursor-pointer" onClick={() => router.push(`/order/${order.id}`)}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-light-border dark:bg-dark-border flex items-center justify-center font-bold">
                                                T{order.table.tableNumber}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">Order #{order.orderNumber}</h3>
                                                <p className="text-xs text-light-muted">
                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {status.label}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-dark-border">
                                        <span className="text-sm text-light-muted italic truncate max-w-[150px]">
                                            {order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                                        </span>
                                        <span className="font-bold text-accent">
                                            {parseFloat(order.totalAmount).toFixed(2)} DH
                                        </span>
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
