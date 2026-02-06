'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Search,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    X,
    Loader2,
    UtensilsCrossed,
    Clock,
    Flame
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

interface RecipeItem {
    inventoryItemId: string;
    quantity: number;
}

interface InventoryItem {
    id: string;
    name: string;
    unit: string;
}

interface MenuItem {
    id: string;
    name: string;
    nameFr: string | null;
    nameAr: string | null;
    description: string | null;
    descriptionFr: string | null;
    descriptionAr: string | null;
    category: string;
    categoryFr: string | null;
    categoryAr: string | null;
    price: string;
    imageUrl: string | null;
    available: boolean;
    sortOrder: number;
    prepTimeMinutes?: number | null;
    calories?: number | null;
    recipeItems?: {
        id: string;
        inventoryItemId: string;
        quantity: string;
        inventoryItem: InventoryItem;
    }[];
}

export default function AdminMenuPage() {
    const router = useRouter();
    const { t, isRTL } = useApp();

    const [items, setItems] = useState<MenuItem[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

    // Form state
    const [form, setForm] = useState({
        name: '',
        nameFr: '',
        nameAr: '',
        description: '',
        descriptionFr: '',
        descriptionAr: '',
        category: '',
        categoryFr: '',
        categoryAr: '',
        price: '',
        imageUrl: '',
        available: true,
        prepTimeMinutes: '',
        calories: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchItems();
        fetchInventory();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await api.getAllMenuItems();
            if (response.success && response.data) {
                setItems(response.data.items as MenuItem[]);
            }
        } catch (error) {
            console.error('Failed to fetch menu:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await api.request<{ items: InventoryItem[] }>('/admin/inventory');
            if (response.success && response.data) {
                setInventoryItems(response.data.items);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        }
    };

    const handleToggle = async (itemId: string) => {
        try {
            await api.toggleMenuItem(itemId);
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, available: !item.available } : item
            ));
        } catch (error) {
            console.error('Failed to toggle item:', error);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await api.deleteMenuItem(itemId);
            setItems(prev => prev.filter(item => item.id !== itemId));
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const openModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setForm({
                name: item.name,
                nameFr: item.nameFr || '',
                nameAr: item.nameAr || '',
                description: item.description || '',
                descriptionFr: item.descriptionFr || '',
                descriptionAr: item.descriptionAr || '',
                category: item.category,
                categoryFr: item.categoryFr || '',
                categoryAr: item.categoryAr || '',
                price: item.price,
                imageUrl: item.imageUrl || '',
                available: item.available,
                prepTimeMinutes: item.prepTimeMinutes?.toString() || '',
                calories: item.calories?.toString() || '',
            });
            setRecipeItems(item.recipeItems?.map(ri => ({
                inventoryItemId: ri.inventoryItemId,
                quantity: parseFloat(ri.quantity)
            })) || []);
        } else {
            setEditingItem(null);
            setForm({
                name: '', nameFr: '', nameAr: '',
                description: '', descriptionFr: '', descriptionAr: '',
                category: '', categoryFr: '', categoryAr: '',
                price: '', imageUrl: '', available: true,
                prepTimeMinutes: '', calories: '',
            });
            setRecipeItems([]);
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.category || !form.price) {
            alert('Name, category, and price are required');
            return;
        }

        setSaving(true);
        try {
            const data: any = {
                ...form,
                price: parseFloat(form.price),
                prepTimeMinutes: form.prepTimeMinutes ? parseInt(form.prepTimeMinutes) : undefined,
                calories: form.calories ? parseInt(form.calories) : undefined,
                nameFr: form.nameFr || undefined,
                nameAr: form.nameAr || undefined,
                descriptionFr: form.descriptionFr || undefined,
                descriptionAr: form.descriptionAr || undefined,
                categoryFr: form.categoryFr || undefined,
                categoryAr: form.categoryAr || undefined,
                imageUrl: form.imageUrl || undefined,
                recipeItems: recipeItems.length > 0 ? recipeItems : undefined,
            };

            if (editingItem) {
                const response = await api.updateMenuItem(editingItem.id, data);
                if (response.success) {
                    fetchItems();
                }
            } else {
                const response = await api.createMenuItem(data);
                if (response.success) {
                    fetchItems();
                }
            }
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save item:', error);
        } finally {
            setSaving(false);
        }
    };

    const addRecipeItem = (inventoryItemId: string) => {
        if (recipeItems.find(ri => ri.inventoryItemId === inventoryItemId)) return;
        setRecipeItems([...recipeItems, { inventoryItemId, quantity: 1 }]);
    };

    const removeRecipeItem = (inventoryItemId: string) => {
        setRecipeItems(recipeItems.filter(ri => ri.inventoryItemId !== inventoryItemId));
    };

    const updateRecipeQuantity = (inventoryItemId: string, quantity: number) => {
        setRecipeItems(recipeItems.map(ri =>
            ri.inventoryItemId === inventoryItemId ? { ...ri, quantity } : ri
        ));
    };

    const filteredItems = items.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.name.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );
    });

    // Group by category
    const grouped = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="p-2 -ml-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                        >
                            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </button>
                        <h1 className="text-xl font-bold">{t('admin.menu')}</h1>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="p-2 rounded-full bg-accent text-white"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-muted" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                </div>
            </header>

            {/* Items List */}
            <main className="p-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent" />
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <div className="text-center py-12">
                        <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-light-muted opacity-50" />
                        <p className="text-light-muted">No menu items yet</p>
                        <button onClick={() => openModal()} className="btn-primary mt-4">
                            <Plus className="w-5 h-5 mr-2" />
                            Add First Item
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([category, categoryItems]) => (
                            <div key={category}>
                                <h2 className="font-semibold text-light-muted dark:text-dark-muted mb-3">
                                    {category} ({categoryItems.length})
                                </h2>
                                <div className="space-y-2">
                                    {categoryItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`card p-4 ${!item.available ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium truncate">{item.name}</span>
                                                        {!item.available && (
                                                            <span className="badge bg-light-border dark:bg-dark-border text-xs">
                                                                Hidden
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-light-muted">
                                                        <span className="text-accent font-medium">
                                                            {parseFloat(item.price).toFixed(2)} DH
                                                        </span>
                                                        {item.prepTimeMinutes && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {item.prepTimeMinutes}min
                                                            </span>
                                                        )}
                                                        {item.calories && (
                                                            <span className="flex items-center gap-1">
                                                                <Flame className="w-3 h-3" />
                                                                {item.calories}cal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleToggle(item.id)}
                                                        className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                                                        title={item.available ? 'Hide item' : 'Show item'}
                                                    >
                                                        {item.available ? (
                                                            <Eye className="w-4 h-4 text-accent" />
                                                        ) : (
                                                            <EyeOff className="w-4 h-4 text-light-muted" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(item)}
                                                        className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-light-bg dark:bg-dark-bg rounded-t-2xl sm:rounded-2xl my-8">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-light-bg dark:bg-dark-bg px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold">
                                {editingItem ? 'Edit Item' : 'Add Item'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-4 space-y-4">
                            {/* Names */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Name (English) *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name (French)</label>
                                    <input
                                        type="text"
                                        value={form.nameFr}
                                        onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name (Arabic)</label>
                                    <input
                                        type="text"
                                        value={form.nameAr}
                                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                                        className="input"
                                        dir="rtl"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Category (English) *</label>
                                <input
                                    type="text"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Hot Drinks, Pastries"
                                    required
                                />
                            </div>

                            {/* Price & Details */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Price (DH) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        Prep (min)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.prepTimeMinutes}
                                        onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        <Flame className="w-3 h-3 inline mr-1" />
                                        Calories
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.calories}
                                        onChange={(e) => setForm({ ...form, calories: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="input min-h-[60px] resize-none"
                                    placeholder="Optional description..."
                                />
                            </div>

                            {/* Recipe Builder */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Recipe (Ingredients)</label>
                                <div className="border border-light-border dark:border-dark-border rounded-lg p-3 space-y-2">
                                    {recipeItems.length === 0 ? (
                                        <p className="text-sm text-light-muted">No ingredients added</p>
                                    ) : (
                                        recipeItems.map((item) => {
                                            const inventoryItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                                            return (
                                                <div key={item.inventoryItemId} className="flex items-center gap-2 bg-light-card dark:bg-dark-card p-2 rounded">
                                                    <span className="text-sm flex-1">{inventoryItem?.name}</span>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        value={item.quantity}
                                                        onChange={(e) => updateRecipeQuantity(item.inventoryItemId, parseFloat(e.target.value))}
                                                        className="input w-20 text-sm py-1"
                                                    />
                                                    <span className="text-xs text-light-muted">{inventoryItem?.unit}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRecipeItem(item.inventoryItemId)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addRecipeItem(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="input text-sm"
                                    >
                                        <option value="">+ Add ingredient</option>
                                        {inventoryItems
                                            .filter(item => !recipeItems.find(ri => ri.inventoryItemId === item.id))
                                            .map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({item.unit})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* Available */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.available}
                                    onChange={(e) => setForm({ ...form, available: e.target.checked })}
                                    className="w-5 h-5 rounded border-light-border text-accent focus:ring-accent"
                                />
                                <span>Available for ordering</span>
                            </label>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-light-bg dark:bg-dark-bg p-4 border-t border-light-border dark:border-dark-border flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 btn-secondary"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 btn-primary"
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    t('common.save')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
