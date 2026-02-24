'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Gift, Edit2, Trash2, ArrowLeft, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

interface BundleItem {
    menuItemId: string;
    quantity: number;
}

interface MenuItem {
    id: string;
    name: string;
    price: string;
}

interface Bundle {
    id: string;
    name: string;
    nameFr?: string;
    nameAr?: string;
    description?: string;
    descriptionFr?: string;
    descriptionAr?: string;
    price: string;
    available: boolean;
    items: Array<{
        id: string;
        quantity: number;
        menuItem: MenuItem;
    }>;
}

export default function BundlesPage() {
    const router = useRouter();
    const { t, isRTL } = useApp();

    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nameFr: '',
        nameAr: '',
        description: '',
        descriptionFr: '',
        descriptionAr: '',
        price: '',
        available: true
    });
    const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchBundles();
        fetchMenuItems();
    }, []);

    const fetchBundles = async () => {
        try {
            const response = await api.request<{ bundles: Bundle[] }>('/admin/bundles');
            if (response.success && response.data) {
                setBundles(response.data.bundles);
            }
        } catch (error) {
            console.error('Failed to fetch bundles:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const response = await api.getAllMenuItems();
            if (response.success && response.data) {
                setMenuItems(response.data.items as MenuItem[]);
            }
        } catch (error) {
            console.error('Failed to fetch menu items:', error);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.price || bundleItems.length === 0) {
            alert('Please fill required fields and add at least one item');
            return;
        }

        setSaving(true);
        try {
            const data = {
                ...formData,
                price: parseFloat(formData.price),
                items: bundleItems
            };

            if (editingBundle) {
                await api.updateBundle(editingBundle.id, data);
            } else {
                await api.createBundle(data);
            }
            resetForm();
            fetchBundles();
        } catch (error) {
            console.error('Failed to save bundle:', error);
        } finally {
            setSaving(false);
        }
    };

    const openModal = (bundle?: Bundle) => {
        if (bundle) {
            setEditingBundle(bundle);
            setFormData({
                name: bundle.name,
                nameFr: bundle.nameFr || '',
                nameAr: bundle.nameAr || '',
                description: bundle.description || '',
                descriptionFr: bundle.descriptionFr || '',
                descriptionAr: bundle.descriptionAr || '',
                price: bundle.price,
                available: bundle.available
            });
            setBundleItems(bundle.items.map(item => ({
                menuItemId: item.menuItem.id,
                quantity: item.quantity
            })));
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const resetForm = () => {
        setShowModal(false);
        setEditingBundle(null);
        setFormData({
            name: '',
            nameFr: '',
            nameAr: '',
            description: '',
            descriptionFr: '',
            descriptionAr: '',
            price: '',
            available: true
        });
        setBundleItems([]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this bundle?')) return;

        try {
            await api.request(`/admin/bundles/${id}`, { method: 'DELETE' });
            fetchBundles();
        } catch (error) {
            alert('Failed to delete bundle');
        }
    };

    const toggleAvailability = async (id: string) => {
        try {
            await api.toggleBundle(id);
            fetchBundles();
        } catch (error) {
            alert('Failed to toggle availability');
        }
    };

    const addBundleItem = (menuItemId: string) => {
        if (bundleItems.find(item => item.menuItemId === menuItemId)) return;
        setBundleItems([...bundleItems, { menuItemId, quantity: 1 }]);
    };

    const removeBundleItem = (menuItemId: string) => {
        setBundleItems(bundleItems.filter(item => item.menuItemId !== menuItemId));
    };

    const updateQuantity = (menuItemId: string, quantity: number) => {
        setBundleItems(bundleItems.map(item =>
            item.menuItemId === menuItemId ? { ...item, quantity } : item
        ));
    };

    const calculateOriginalPrice = (bundle: Bundle) => {
        return bundle.items.reduce((sum, item) =>
            sum + (parseFloat(item.menuItem.price) * item.quantity), 0
        );
    };

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
                        <h1 className="text-xl font-bold">Bundles</h1>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="p-2 rounded-full bg-accent text-white"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="p-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent" />
                    </div>
                ) : bundles.length === 0 ? (
                    <div className="text-center py-12 card">
                        <Gift className="w-12 h-12 mx-auto mb-4 text-light-muted opacity-50" />
                        <p className="text-light-muted">No bundles yet</p>
                        <button onClick={() => openModal()} className="btn-primary mt-4">
                            <Plus className="w-5 h-5 mr-2" />
                            Create First Bundle
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bundles.map((bundle) => {
                            const originalPrice = calculateOriginalPrice(bundle);
                            const discount = ((originalPrice - parseFloat(bundle.price)) / originalPrice) * 100;

                            return (
                                <div
                                    key={bundle.id}
                                    className={`card p-4 ${!bundle.available ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold">{bundle.name}</h3>
                                                {!bundle.available && (
                                                    <span className="badge bg-light-border dark:bg-dark-border text-xs">
                                                        Hidden
                                                    </span>
                                                )}
                                            </div>
                                            {bundle.description && (
                                                <p className="text-sm text-light-muted mt-1">{bundle.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-light-muted">Bundle Price:</span>
                                            <span className="font-bold text-accent">{parseFloat(bundle.price).toFixed(2)} DH</span>
                                        </div>
                                        {discount > 0 && (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-light-muted">Original:</span>
                                                    <span className="line-through">{originalPrice.toFixed(2)} DH</span>
                                                </div>
                                                <div className="text-xs text-green-600 dark:text-green-400 text-right">
                                                    Save {discount.toFixed(0)}%
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="mb-3 p-2 bg-light-card dark:bg-dark-card rounded-lg">
                                        <p className="text-xs text-light-muted mb-1">Includes:</p>
                                        {bundle.items.map((item, idx) => (
                                            <div key={idx} className="text-sm">
                                                {item.quantity}× {item.menuItem.name}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleAvailability(bundle.id)}
                                            className="p-2 rounded-lg bg-light-border dark:bg-dark-border hover:bg-light-card dark:hover:bg-dark-card"
                                        >
                                            {bundle.available ? (
                                                <Eye className="w-4 h-4 text-accent" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-light-muted" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openModal(bundle)}
                                            className="flex-1 btn-secondary text-sm py-2"
                                        >
                                            <Edit2 className="w-4 h-4 inline mr-1" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(bundle.id)}
                                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-light-bg dark:bg-dark-bg rounded-t-2xl sm:rounded-2xl">
                        <div className="sticky top-0 bg-light-bg dark:bg-dark-bg px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold">
                                {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name (EN) *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name (FR)</label>
                                    <input
                                        type="text"
                                        value={formData.nameFr}
                                        onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name (AR)</label>
                                    <input
                                        type="text"
                                        value={formData.nameAr}
                                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                        className="input text-right"
                                        dir="rtl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Bundle Price (DH) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description (EN)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input min-h-[60px] resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description (FR)</label>
                                <textarea
                                    value={formData.descriptionFr || ''}
                                    onChange={(e) => setFormData({ ...formData, descriptionFr: e.target.value })}
                                    className="input min-h-[60px] resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (AR)</label>
                                <textarea
                                    value={formData.descriptionAr || ''}
                                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                                    className="input min-h-[60px] resize-none text-right"
                                    dir="rtl"
                                />
                            </div>

                            {/* Bundle Items */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Items in Bundle *</label>
                                <div className="border border-light-border dark:border-dark-border rounded-lg p-3 space-y-2">
                                    {bundleItems.length === 0 ? (
                                        <p className="text-sm text-light-muted">No items added</p>
                                    ) : (
                                        bundleItems.map((item) => {
                                            const menuItem = menuItems.find(m => m.id === item.menuItemId);
                                            return (
                                                <div key={item.menuItemId} className="flex items-center gap-2 bg-light-card dark:bg-dark-card p-2 rounded">
                                                    <span className="text-sm flex-1">{menuItem?.name}</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.menuItemId, parseInt(e.target.value))}
                                                        className="input w-16 text-sm py-1"
                                                    />
                                                    <span className="text-xs text-light-muted">×</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBundleItem(item.menuItemId)}
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
                                                addBundleItem(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="input text-sm"
                                    >
                                        <option value="">+ Add menu item</option>
                                        {menuItems
                                            .filter(item => !bundleItems.find(bi => bi.menuItemId === item.id))
                                            .map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({parseFloat(item.price).toFixed(2)} DH)
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.available}
                                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                                    className="w-5 h-5 rounded border-light-border text-accent focus:ring-accent"
                                />
                                <span>Available for ordering</span>
                            </label>
                        </div>

                        <div className="sticky bottom-0 bg-light-bg dark:bg-dark-bg p-4 border-t border-light-border dark:border-dark-border flex gap-3">
                            <button
                                onClick={resetForm}
                                className="flex-1 btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex-1 btn-primary"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingBundle ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
