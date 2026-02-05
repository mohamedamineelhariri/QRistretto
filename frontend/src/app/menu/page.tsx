'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Minus, Search, X, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { useApp } from '../providers';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { ThemeToggle } from '@/components/ThemeToggle';

interface MenuItem {
    id: string;
    name: string;
    nameEn: string;
    nameFr: string | null;
    nameAr: string | null;
    description: string | null;
    price: number;
    imageUrl: string | null;
    available: boolean;
}

interface Category {
    category: string;
    categoryEn: string;
    categoryFr: string | null;
    categoryAr: string | null;
    items: MenuItem[];
}

export default function MenuPage() {
    const router = useRouter();
    const { t, locale, isRTL } = useApp();
    const { items: cartItems, addItem, getItemCount, getTotal, restaurantId, token } = useCartStore();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showCart, setShowCart] = useState(false);

    useEffect(() => {
        if (!restaurantId || !token) {
            router.push('/');
            return;
        }
        fetchMenu();
    }, [restaurantId, token, locale]);

    const fetchMenu = async () => {
        if (!restaurantId || !token) return;

        try {
            // VERIFY TOKEN IS STILL VALID
            const validation = await api.validateToken(token);
            if (!validation.success) {
                router.push('/');
                return;
            }

            const response = await api.getMenu(restaurantId, locale);
            if (response.success && response.data) {
                setCategories(response.data.categories);
                if (response.data.categories.length > 0) {
                    setActiveCategory(response.data.categories[0].category);
                }
            }
        } catch (error) {
            console.error('Validation or menu fetch failed:', error);
            router.push('/'); // Kick out on any validation error
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (item: MenuItem) => {
        addItem({
            menuItemId: item.id,
            name: item.name,
            nameFr: item.nameFr || undefined,
            nameAr: item.nameAr || undefined,
            price: item.price,
        });
    };

    const getItemInCart = (itemId: string) => {
        return cartItems.find(i => i.menuItemId === itemId);
    };

    // Filter items by search
    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                item.name.toLowerCase().includes(query) ||
                item.nameEn.toLowerCase().includes(query) ||
                item.nameFr?.toLowerCase().includes(query) ||
                item.nameAr?.includes(query)
            );
        }),
    })).filter(cat => cat.items.length > 0);

    const itemCount = getItemCount();
    const total = getTotal();

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

    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-light-border dark:border-dark-border safe-area-top">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-bold">{t('menu.title')}</h1>
                        <div className="flex items-center gap-2">
                            <LanguageSwitch />
                            <ThemeToggle />
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-muted dark:text-dark-muted" />
                        <input
                            type="text"
                            placeholder={t('menu.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category tabs */}
                {!searchQuery && (
                    <div className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.categoryEn}
                                onClick={() => setActiveCategory(cat.category)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.category
                                    ? 'bg-accent text-white'
                                    : 'bg-light-card dark:bg-dark-card text-light-muted dark:text-dark-muted'
                                    }`}
                            >
                                {cat.category}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {/* Menu Items */}
            <main className="px-4 py-4">
                {filteredCategories.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-light-muted dark:text-dark-muted">{t('menu.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredCategories.map((category) => (
                            <section
                                key={category.categoryEn}
                                className={searchQuery || activeCategory === category.category ? '' : 'hidden'}
                            >
                                {searchQuery && (
                                    <h2 className="text-lg font-semibold mb-3">{category.category}</h2>
                                )}
                                <div className="space-y-3">
                                    {category.items.map((item) => {
                                        const inCart = getItemInCart(item.id);

                                        return (
                                            <div
                                                key={item.id}
                                                className="card-hover p-4 flex gap-4"
                                            >
                                                {/* Image placeholder */}
                                                {item.imageUrl ? (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-lg bg-light-border dark:bg-dark-border flex-shrink-0" />
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-base mb-1">{item.name}</h3>
                                                    {item.description && (
                                                        <p className="text-sm text-light-muted dark:text-dark-muted line-clamp-2 mb-2">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-accent">
                                                            {item.price.toFixed(2)} DH
                                                        </span>

                                                        {inCart ? (
                                                            <div className="flex items-center gap-1 bg-accent/10 rounded-full">
                                                                <button
                                                                    onClick={() => useCartStore.getState().updateQuantity(item.id, inCart.quantity - 1)}
                                                                    className="p-2 text-accent hover:bg-accent/20 rounded-full"
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <span className="w-6 text-center font-medium text-accent">
                                                                    {inCart.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => useCartStore.getState().updateQuantity(item.id, inCart.quantity + 1)}
                                                                    className="p-2 text-accent hover:bg-accent/20 rounded-full"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleAddToCart(item)}
                                                                className="flex items-center gap-1 px-3 py-2 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent-hover transition-colors"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                <span>{t('menu.addToCart')}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>

            {/* Fixed Cart Bar */}
            {itemCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-t border-light-border dark:border-dark-border safe-area-bottom">
                    <button
                        onClick={() => router.push('/cart')}
                        className="w-full btn-primary flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingCart className="w-5 h-5" />
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-accent text-xs font-bold rounded-full flex items-center justify-center">
                                    {itemCount}
                                </span>
                            </div>
                            <span>{t('cart.title')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{total.toFixed(2)} DH</span>
                            <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
