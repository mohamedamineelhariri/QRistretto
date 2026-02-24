'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Grid3X3,
    ClipboardList,
    Users,
    Settings,
    LogOut,
    TrendingUp,
    Clock,
    DollarSign,
    Coffee,
    Package,
    Gift
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

interface DashboardData {
    todayOrders: number;
    pendingOrders: number;
    totalMenuItems: number;
    totalTables: number;
    todayRevenue: number;
    lowStockItems?: Array<{
        id: string;
        name: string;
        currentStock: number;
        minThreshold: number;
        unit: string;
    }>;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { t } = useApp();

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const [dashRes, lowStockRes] = await Promise.all([
                api.getDashboard(),
                api.getLowStock()
            ]);

            if (dashRes.success && dashRes.data) {
                setData({
                    ...dashRes.data,
                    lowStockItems: lowStockRes.success && lowStockRes.data ? lowStockRes.data.items : []
                });
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
            router.push('/admin');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await api.logout();
        router.push('/admin');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Coffee className="w-12 h-12 text-accent animate-pulse" />
            </div>
        );
    }

    const stats = [
        { label: "Today's Orders", value: data?.todayOrders || 0, icon: ClipboardList, color: 'text-blue-500' },
        { label: 'Pending Orders', value: data?.pendingOrders || 0, icon: Clock, color: 'text-amber-500' },
        { label: 'Menu Items', value: data?.totalMenuItems || 0, icon: UtensilsCrossed, color: 'text-purple-500' },
        { label: 'Active Tables', value: data?.totalTables || 0, icon: Grid3X3, color: 'text-green-500' },
    ];

    const navItems = [
        { href: '/admin/dashboard', label: t('admin.dashboard'), icon: LayoutDashboard },
        { href: '/admin/menu', label: t('admin.menu'), icon: UtensilsCrossed },
        { href: '/admin/tables', label: t('admin.tables'), icon: Grid3X3 },
        { href: '/admin/orders', label: t('admin.orders'), icon: ClipboardList },
        { href: '/admin/staff', label: t('admin.staff'), icon: Users },
        { href: '/admin/inventory', label: 'Inventory', icon: Package },
        { href: '/admin/bundles', label: 'Bundles', icon: Gift },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Coffee className="w-6 h-6 text-accent" />
                        <h1 className="text-xl font-bold">{t('admin.title')}</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border text-light-muted dark:text-dark-muted"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="p-4 pb-24">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {stats.map((stat) => (
                        <div key={stat.label} className="card p-4">
                            <div className={`w-10 h-10 rounded-lg ${stat.color} bg-current/10 flex items-center justify-center mb-3`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-sm text-light-muted dark:text-dark-muted">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Revenue Card */}
                <div className="card p-6 mb-6 bg-gradient-to-br from-accent to-emerald-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-80">Today's Revenue</p>
                            <p className="text-3xl font-bold mt-1">
                                {(data?.todayRevenue || 0).toFixed(2)} DH
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                {data?.lowStockItems && data.lowStockItems.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3 text-red-500">
                            <Package className="w-5 h-5" />
                            <h2 className="font-semibold">Low Stock Alerts</h2>
                        </div>
                        <div className="space-y-2">
                            {data.lowStockItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href="/admin/inventory"
                                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl"
                                >
                                    <div>
                                        <p className="font-medium text-red-700 dark:text-red-400">{item.name}</p>
                                        <p className="text-xs text-red-600 dark:text-red-500 opacity-80">
                                            Threshold: {item.minThreshold} {item.unit}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-700 dark:text-red-400">
                                            {item.currentStock} {item.unit}
                                        </p>
                                        <p className="text-[10px] text-red-600 dark:text-red-500 uppercase font-bold">Refill Required</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Links */}
                <h2 className="font-semibold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/kitchen" className="card p-4 flex items-center gap-3 hover:shadow-medium transition-shadow">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="font-medium">Kitchen View</span>
                    </Link>
                    <Link href="/waiter" className="card p-4 flex items-center gap-3 hover:shadow-medium transition-shadow">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="font-medium">Waiter View</span>
                    </Link>
                    <Link href="/admin/settings" className="card p-4 flex items-center gap-3 hover:shadow-medium transition-shadow">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-500" />
                        </div>
                        <span className="font-medium">Settings</span>
                    </Link>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-light-bg dark:bg-dark-bg border-t border-light-border dark:border-dark-border safe-area-bottom">
                <div className="flex justify-around py-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center gap-1 px-3 py-2 text-light-muted dark:text-dark-muted hover:text-accent"
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-xs">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </div>
    );
}
