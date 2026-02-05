'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore, useOrderStore } from '@/lib/store';
import { useApp } from '../providers';

export default function CartPage() {
    const router = useRouter();
    const { t, locale, isRTL } = useApp();
    const {
        items,
        token,
        getTotal,
        updateQuantity,
        updateNotes,
        removeItem,
        clearCart
    } = useCartStore();
    const setCurrentOrder = useOrderStore(state => state.setCurrentOrder);

    const [orderNotes, setOrderNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getItemName = (item: typeof items[0]) => {
        if (locale === 'fr' && item.nameFr) return item.nameFr;
        if (locale === 'ar' && item.nameAr) return item.nameAr;
        return item.name;
    };

    const handlePlaceOrder = async () => {
        if (!token || items.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.createOrder({
                token,
                items: items.map(item => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    notes: item.notes,
                })),
                notes: orderNotes || undefined,
            });

            if (response.success && response.data) {
                const order = response.data.order as any;
                setCurrentOrder(order.id);
                clearCart();
                router.push(`/order/${order.id}`);
            } else {
                setError(response.message || 'Failed to place order');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const total = getTotal();

    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border safe-area-top">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                        >
                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </button>
                        <h1 className="text-xl font-bold">{t('cart.title')}</h1>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-light-border dark:bg-dark-border flex items-center justify-center">
                            <Trash2 className="w-8 h-8 text-light-muted dark:text-dark-muted" />
                        </div>
                        <p className="text-light-muted dark:text-dark-muted mb-4">{t('cart.empty')}</p>
                        <button
                            onClick={() => router.push('/menu')}
                            className="btn-primary"
                        >
                            {t('menu.title')}
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border safe-area-top">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                    >
                        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                    <h1 className="text-xl font-bold">{t('cart.title')}</h1>
                    <span className="text-sm text-light-muted dark:text-dark-muted">
                        ({items.length} {t('cart.items')})
                    </span>
                </div>
            </header>

            {/* Cart Items */}
            <main className="px-4 py-4">
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.menuItemId} className="card p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium">{getItemName(item)}</h3>
                                    <p className="text-accent font-semibold">
                                        {item.price.toFixed(2)} DH
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeItem(item.menuItemId)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                {/* Quantity controls */}
                                <div className="flex items-center gap-1 bg-light-border dark:bg-dark-border rounded-full">
                                    <button
                                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                        className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-full"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-medium">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                        className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-full"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <span className="font-bold">
                                    {(item.price * item.quantity).toFixed(2)} DH
                                </span>
                            </div>

                            {/* Item notes */}
                            <div className="mt-3 pt-3 border-t border-light-border dark:border-dark-border">
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-light-muted dark:text-dark-muted" />
                                    <input
                                        type="text"
                                        placeholder="Special instructions..."
                                        value={item.notes || ''}
                                        onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Order Notes */}
                <div className="mt-6">
                    <label className="block text-sm font-medium mb-2">
                        {t('cart.notes')}
                    </label>
                    <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Any special requests for your order..."
                        className="input min-h-[100px] resize-none"
                        maxLength={500}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </main>

            {/* Fixed Bottom - Total & Order Button */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-light-bg dark:bg-dark-bg border-t border-light-border dark:border-dark-border safe-area-bottom">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-lg">
                        <span className="font-medium">{t('cart.total')}</span>
                        <span className="font-bold text-accent">{total.toFixed(2)} DH</span>
                    </div>

                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading || items.length === 0}
                        className="btn-primary w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                {t('common.loading')}
                            </>
                        ) : (
                            t('cart.placeOrder')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
