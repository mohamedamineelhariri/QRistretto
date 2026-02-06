'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, AlertTriangle, Edit2, Trash2, TrendingDown, ArrowUp, ArrowLeft, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

interface InventoryItem {
    id: string;
    name: string;
    nameFr?: string;
    nameAr?: string;
    unit: string;
    currentStock: string;
    minStock: string;
    costPerUnit: string;
}

export default function InventoryPage() {
    const router = useRouter();
    const { t, isRTL } = useApp();

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nameFr: '',
        nameAr: '',
        unit: 'pieces',
        currentStock: '',
        minStock: '',
        costPerUnit: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const response = await api.request<{ items: InventoryItem[] }>('/admin/inventory');
            if (response.success && response.data) {
                setItems(response.data.items);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.currentStock || !formData.minStock || !formData.costPerUnit) {
            alert('Please fill all required fields');
            return;
        }

        setSaving(true);
        try {
            if (editingItem) {
                await api.request(`/admin/inventory/${editingItem.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                await api.request('/admin/inventory', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }
            setShowModal(false);
            setEditingItem(null);
            setFormData({
                name: '',
                nameFr: '',
                nameAr: '',
                unit: 'pieces',
                currentStock: '',
                minStock: '',
                costPerUnit: ''
            });
            fetchInventory();
        } catch (error) {
            console.error('Failed to save item:', error);
        } finally {
            setSaving(false);
        }
    };

    const openModal = (item?: InventoryItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                nameFr: item.nameFr || '',
                nameAr: item.nameAr || '',
                unit: item.unit,
                currentStock: item.currentStock,
                minStock: item.minStock,
                costPerUnit: item.costPerUnit
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                nameFr: '',
                nameAr: '',
                unit: 'pieces',
                currentStock: '',
                minStock: '',
                costPerUnit: ''
            });
        }
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this ingredient? Items using it in recipes will prevent deletion.')) return;

        try {
            await api.request(`/admin/inventory/${id}`, { method: 'DELETE' });
            fetchInventory();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete item');
        }
    };

    const handleAddStock = async (id: string) => {
        const quantity = prompt('Enter quantity to add:');
        if (!quantity || isNaN(Number(quantity))) return;

        try {
            await api.request(`/admin/inventory/${id}/add-stock`, {
                method: 'PATCH',
                body: JSON.stringify({ quantity: Number(quantity) })
            });
            fetchInventory();
        } catch (error) {
            alert('Failed to add stock');
        }
    };

    const isLowStock = (item: InventoryItem) => {
        return parseFloat(item.currentStock) <= parseFloat(item.minStock);
    };

    const lowStockCount = items.filter(isLowStock).length;

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
                        <h1 className="text-xl font-bold">Inventory</h1>
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
                ) : (
                    <>
                        {/* Low Stock Alert */}
                        {lowStockCount > 0 && (
                            <div className="mb-4 card bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-medium">{lowStockCount} item(s) low on stock</span>
                                </div>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="text-center py-12 card">
                                <Package className="w-12 h-12 mx-auto mb-4 text-light-muted opacity-50" />
                                <p className="text-light-muted">No inventory items yet</p>
                                <button onClick={() => openModal()} className="btn-primary mt-4">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add First Item
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`card p-4 ${isLowStock(item) ? 'border-2 border-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold">{item.name}</h3>
                                                    {isLowStock(item) && (
                                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                                {item.nameFr && <p className="text-sm text-light-muted">{item.nameFr}</p>}
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-light-muted">Current:</span>
                                                <span className="font-bold">{parseFloat(item.currentStock).toFixed(2)} {item.unit}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-light-muted">Min Stock:</span>
                                                <span>{parseFloat(item.minStock).toFixed(2)} {item.unit}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-light-muted">Cost/Unit:</span>
                                                <span>{parseFloat(item.costPerUnit).toFixed(2)} DH</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mt-2">
                                                <div className="h-2 bg-light-border dark:bg-dark-border rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${isLowStock(item) ? 'bg-red-500' : 'bg-green-500'}`}
                                                        style={{
                                                            width: `${Math.min(
                                                                (parseFloat(item.currentStock) / parseFloat(item.minStock)) * 100,
                                                                100
                                                            )}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAddStock(item.id)}
                                                className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                                Add Stock
                                            </button>
                                            <button
                                                onClick={() => openModal(item)}
                                                className="p-2 rounded-lg bg-light-border dark:bg-dark-border hover:bg-light-card dark:hover:bg-dark-card"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/30"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-md bg-light-bg dark:bg-dark-bg rounded-t-2xl sm:rounded-2xl">
                        <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                            <h2 className="text-lg font-bold">
                                {editingItem ? 'Edit Ingredient' : 'Add Ingredient'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
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
                                <label className="block text-sm font-medium mb-1">Unit *</label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="input"
                                >
                                    <option value="pieces">Pieces</option>
                                    <option value="kg">Kilograms</option>
                                    <option value="g">Grams</option>
                                    <option value="liters">Liters</option>
                                    <option value="ml">Milliliters</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Current Stock *</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={formData.currentStock}
                                        onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Min Stock *</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={formData.minStock}
                                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Cost per Unit (DH) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.costPerUnit}
                                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-light-border dark:border-dark-border flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex-1 btn-primary"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingItem ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
