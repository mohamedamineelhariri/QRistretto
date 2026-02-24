'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Clock, ChefHat, Bell, Package, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
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
    updatedAt: string;
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
    PENDING: {
        icon: Clock,
        label: 'order.pending',
        color: 'text-status-pending',
        bgColor: 'bg-status-pending/10',
        step: 1,
    },
    ACCEPTED: {
        icon: CheckCircle,
        label: 'order.accepted',
        color: 'text-status-accepted',
        bgColor: 'bg-status-accepted/10',
        step: 2,
    },
    PREPARING: {
        icon: ChefHat,
        label: 'order.preparing',
        color: 'text-status-preparing',
        bgColor: 'bg-status-preparing/10',
        step: 3,
    },
    READY: {
        icon: Bell,
        label: 'order.ready',
        color: 'text-status-ready',
        bgColor: 'bg-status-ready/10',
        step: 4,
    },
    DELIVERED: {
        icon: Package,
        label: 'order.delivered',
        color: 'text-status-delivered',
        bgColor: 'bg-status-delivered/10',
        step: 5,
    },
    CANCELLED: {
        icon: XCircle,
        label: 'order.cancelled',
        color: 'text-status-cancelled',
        bgColor: 'bg-status-cancelled/10',
        step: 0,
    },
};

export default function OrderPageClient() {
    const params = useParams();
    const router = useRouter();
    const { t, locale, isRTL } = useApp();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    const orderId = params.id as string;

    useEffect(() => {
        if (orderId) {
            fetchOrder();

            socketClient.connect();
            socketClient.joinOrder(orderId);

            const unsubscribe = socketClient.onOrderStatus((data) => {
                if (data.orderId === orderId) {
                    setOrder(prev => prev ? { ...prev, status: data.status, updatedAt: data.updatedAt } : null);
                }
            });

            return () => {
                unsubscribe();
                socketClient.leaveOrder(orderId);
            };
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const response = await api.getOrder(orderId);
            if (response.success && response.data) {
                setOrder(response.data.order as Order);
            }
        } catch (error) {
            console.error('Failed to fetch order:', error);
        } finally {
            setLoading(false);
        }
    };

    const getItemName = (item: Order['items'][0]) => {
        if (locale === 'fr' && item.menuItem.nameFr) return item.menuItem.nameFr;
        if (locale === 'ar' && item.menuItem.nameAr) return item.menuItem.nameAr;
        return item.menuItem.name;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20" />
                    <p className="text-light-muted dark:text-dark-muted">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-light-muted dark:text-dark-muted mb-4">Order not found</p>
                    <button onClick={() => router.push('/')} className="btn-primary">
                        {t('common.back')}
                    </button>
                </div>
            </div>
        );
    }

    const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
    const StatusIcon = status.icon;
    const steps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'];
    const currentStepIndex = steps.indexOf(order.status);

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border safe-area-top">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/menu')}
                            className="p-2 -ml-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                        >
                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">{t('order.number')}{order.orderNumber}</h1>
                            <p className="text-sm text-light-muted dark:text-dark-muted">
                                {t('order.table')} {order.table.tableNumber}
                                {order.table.tableName && ` - ${order.table.tableName}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchOrder}
                        className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="p-4">
                <div className={`card p-6 mb-6 ${status.bgColor}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-full ${status.bgColor} flex items-center justify-center mb-4`}>
                            <StatusIcon className={`w-8 h-8 ${status.color}`} />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${status.color}`}>
                            {t(status.label)}
                        </h2>
                        <p className="text-sm text-light-muted dark:text-dark-muted">
                            Updated: {new Date(order.updatedAt).toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                    <div className="card p-4 mb-6">
                        <div className="flex justify-between items-center">
                            {steps.slice(0, -1).map((step, index) => {
                                const stepStatus = statusConfig[step as keyof typeof statusConfig];
                                const isCompleted = currentStepIndex > index;
                                const isCurrent = currentStepIndex === index;

                                return (
                                    <div key={step} className="flex-1 flex items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted ? 'bg-accent text-white' :
                                            isCurrent ? `${stepStatus.bgColor} ${stepStatus.color}` :
                                                'bg-light-border dark:bg-dark-border text-light-muted'
                                            }`}>
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        {index < steps.length - 2 && (
                                            <div className={`flex-1 h-0.5 mx-1 ${isCompleted ? 'bg-accent' : 'bg-light-border dark:bg-dark-border'
                                                }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="card">
                    <h3 className="px-4 py-3 font-semibold border-b border-light-border dark:border-dark-border">
                        Order Items
                    </h3>
                    <div className="divide-y divide-light-border dark:divide-dark-border">
                        {order.items.map((item) => (
                            <div key={item.id} className="px-4 py-3 flex justify-between">
                                <div className="flex-1">
                                    <span className="font-medium">{item.quantity}x</span>{' '}
                                    <span>{getItemName(item)}</span>
                                    {item.notes && (
                                        <p className="text-sm text-light-muted dark:text-dark-muted">
                                            Note: {item.notes}
                                        </p>
                                    )}
                                </div>
                                <span className="font-medium">
                                    {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} DH
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="px-4 py-3 border-t border-light-border dark:border-dark-border flex justify-between font-bold">
                        <span>{t('cart.total')}</span>
                        <span className="text-accent">{parseFloat(order.totalAmount).toFixed(2)} DH</span>
                    </div>
                </div>

                {order.notes && (
                    <div className="card mt-4 p-4">
                        <h3 className="font-semibold mb-2">Notes</h3>
                        <p className="text-light-muted dark:text-dark-muted">{order.notes}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
