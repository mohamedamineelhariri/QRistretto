'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Settings,
    Save,
    Wifi,
    WifiOff,
    Globe,
    Phone,
    MapPin,
    Image as ImageIcon,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface RestaurantSettings {
    wifiValidationEnabled: boolean;
    bundlesEnabled: boolean;
    // Add more toggles as needed
}

interface RestaurantData {
    id: string;
    name: string;
    nameFr: string | null;
    nameAr: string | null;
    logoUrl: string | null;
    phoneNumber: string | null;
    address: string | null;
    settings: RestaurantSettings;
}

export default function AdminSettings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<RestaurantData>({
        id: '',
        name: '',
        nameFr: '',
        nameAr: '',
        logoUrl: '',
        phoneNumber: '',
        address: '',
        settings: {
            wifiValidationEnabled: true,
            bundlesEnabled: true
        }
    });

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.getRestaurant();
            if (response.success && response.data) {
                const rest = response.data.restaurant as any;
                setFormData({
                    id: rest.id,
                    name: rest.name || '',
                    nameFr: rest.nameFr || '',
                    nameAr: rest.nameAr || '',
                    logoUrl: rest.logoUrl || '',
                    phoneNumber: rest.phoneNumber || '',
                    address: rest.address || '',
                    settings: rest.settings || { wifiValidationEnabled: true, bundlesEnabled: true }
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const response = await api.updateRestaurant(formData);
            if (response.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleSetting = (key: keyof RestaurantSettings) => {
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                [key]: !formData.settings[key]
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-light-border dark:border-dark-border">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="p-2 -ml-2 rounded-full hover:bg-light-muted/10">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Settings className="w-5 h-5 text-accent" />
                            General Settings
                        </h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary flex items-center gap-2 px-6 py-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : success ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {success ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-6 pb-24">
                {/* Basic Info */}
                <section className="card p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-500" />
                        Restaurant Identity
                    </h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-70">Name (English)</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g. Cafe Nero"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-70">Name (French)</label>
                                <input
                                    type="text"
                                    value={formData.nameFr || ''}
                                    onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-70 text-right">الإسم (بالعربية)</label>
                                <input
                                    type="text"
                                    value={formData.nameAr || ''}
                                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                    className="input w-full text-right"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-medium mb-1.5 opacity-70 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Logo URL
                            </label>
                            <input
                                type="text"
                                value={formData.logoUrl || ''}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                className="input w-full"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </section>

                {/* Contact Info */}
                <section className="card p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-emerald-500" />
                        Contact & Location
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 opacity-70">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                <input
                                    type="tel"
                                    value={formData.phoneNumber || ''}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="input w-full pl-10"
                                    placeholder="+212 ..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 opacity-70">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                                <input
                                    type="text"
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input w-full pl-10"
                                    placeholder="Store Address..."
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Toggles */}
                <section className="card p-6">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-500" />
                        Feature Management
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-light-muted/5 rounded-xl border border-light-border dark:border-dark-border">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.settings.wifiValidationEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {formData.settings.wifiValidationEnabled ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-medium">Wi-Fi Validation</p>
                                    <p className="text-sm opacity-60">Restrict ordering to customers on cafe Wi-Fi</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleSetting('wifiValidationEnabled')}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.settings.wifiValidationEnabled ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.settings.wifiValidationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-light-muted/5 rounded-xl border border-light-border dark:border-dark-border">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium">Bundles Support</p>
                                    <p className="text-sm opacity-60">Enable menu item bundles and deals</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleSetting('bundlesEnabled')}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.settings.bundlesEnabled ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.settings.bundlesEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
