'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Search,
    Users,
    Shield,
    Key,
    Trash2,
    X,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

interface Staff {
    id: string;
    name: string;
    role: string;
    staffId: string;
    pin: string;
    active: boolean;
}

export default function AdminStaffPage() {
    const router = useRouter();
    const { t, isRTL } = useApp();

    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        role: 'WAITER',
        pin: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const response = await api.getStaff();
            if (response.success && response.data) {
                setStaff(response.data.staff as Staff[]);
            }
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.pin) return;

        setSaving(true);
        try {
            const response = await api.createStaff({
                name: form.name,
                pin: form.pin,
                role: form.role,
            });

            if (response.success) {
                fetchStaff();
                setShowModal(false);
                setForm({ name: '', role: 'WAITER', pin: '' });
            }
        } catch (error) {
            console.error('Failed to create staff:', error);
        } finally {
            setSaving(false);
        }
    };

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
                        <h1 className="text-xl font-bold">{t('admin.staff')}</h1>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="p-2 rounded-full bg-accent text-white"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent" />
                    </div>
                ) : staff.length === 0 ? (
                    <div className="text-center py-12 card">
                        <Users className="w-12 h-12 mx-auto mb-4 text-light-muted opacity-50" />
                        <p className="text-light-muted">No staff members yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {staff.map((member) => (
                            <div key={member.id} className="card p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">{member.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${member.role === 'KITCHEN' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                                <span className="text-[10px] text-light-muted font-mono">{member.staffId}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1 text-xs text-light-muted">
                                            <Key className="w-3 h-3" />
                                            <span>PIN: {member.pin}</span>
                                        </div>
                                        {member.active && (
                                            <div className="flex items-center gap-1 text-[10px] text-accent">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Active</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Staff Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-sm bg-light-bg dark:bg-dark-bg rounded-t-2xl sm:rounded-2xl">
                        <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                            <h2 className="text-lg font-bold">Add Staff Member</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Ahmed Kassmi"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="input appearance-none bg-no-repeat bg-[right_1rem_center]"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundSize: '1rem' }}
                                >
                                    <option value="WAITER">Waiter</option>
                                    <option value="KITCHEN">Kitchen / Chef</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">PIN Code (4 digits)</label>
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={form.pin}
                                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                                    className="input font-mono"
                                    placeholder="e.g., 1234"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-light-border dark:border-dark-border flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.name || form.pin.length < 4}
                                className="flex-1 btn-primary"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Staff'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
