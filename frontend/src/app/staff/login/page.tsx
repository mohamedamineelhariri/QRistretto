'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Lock, ChevronRight, Loader2, Utensils } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

export default function StaffLoginPage() {
    const router = useRouter();
    const { t } = useApp();
    const [step, setStep] = useState<'select' | 'pin'>('select');
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // We'll need a way to get the staff list. 
        // Since we don't have a public endpoint for this, we might need a preliminary step 
        // or just let them enter ID manually if we can't list.
        // For now, let's assume we can fetch active staff if we have a restaurant context or just generic login.
        // ACTUALLY: A common pattern is entering a "Terminal Code" first, but for simplicity:
        // Let's mock the "Select Staff" step isn't easily possible without a token.
        // So we will just ask for Staff ID (or Name if we can) and PIN.
        // BUT better UX: The Manager logs in the device once (Admin Token), then Waiters just tap their name?
        // Let's implement a simple "Enter Staff ID/PIN" for now to match the backend endpoint.
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // We need a valid UUID for staffId. 
            // Since the user might not know their UUID, this flow is tricky without a list.
            // Let's check if there's an endpoint to get staff list.
            // If not, I'll update the plan to assume we need a "Device Setup" phase or just use the Admin Dashboard to "Open Waiter View".

            // Wait! The user request was "assigned by statue to the staff".
            // To do this properly, the waiter MUST log in.
            // Let's change the UI to be a "PIN Pad" style if we can, but we need the ID.

            // Workaround: We will fetch the staff list using the *Admin Token* (if present) 
            // because usually a manager sets up the tablet.

            const adminToken = localStorage.getItem('admin_token');
            // If no admin token, we can't easily list staff.

            const response = await api.staffLogin(selectedStaff, pin); // This assumes api.staffLogin is updated to take ID and PIN

            if (response.success && response.data) {
                // Save STAFF token
                localStorage.setItem('staff_token', response.data.token);
                localStorage.setItem('staff_info', JSON.stringify(response.data.staff));

                // Redirect based on role
                // Redirect based on role
                if (response.data.staff.role === 'KITCHEN') {
                    router.push('/kitchen');
                } else if (response.data.staff.role === 'MANAGER') {
                    // Manager role doesn't exist technically, but just in case
                    router.push('/admin/dashboard');
                } else {
                    router.push('/waiter');
                }
            } else {
                setError('Invalid PIN');
            }
        } catch (err) {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    // TEMPORARY: Since we don't have a list endpoint public, 
    // and I don't want to overengineer a new public endpoint right now without user permission,
    // I will look for a way to list staff.
    // The `GET /api/staff` usually requires Admin Token.

    // For this task, I'll rely on the existing Admin Token to fetch staff list for the "Login Screen".
    // If Admin Token is missing, redirect to Admin Login.

    useEffect(() => {
        // Fetch staff list (public)
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await api.getPublicStaffList();
            if (res.success && res.data) {
                setStaffList(res.data.staff.filter((s: any) => s.isActive || s.active !== false));
            }
        } catch (e) {
            console.error(e);
            setError('Failed to load staff list');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg text-dark-text p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                        <Users className="w-10 h-10 text-accent" />
                    </div>
                    <h1 className="text-2xl font-bold">Staff Login</h1>
                    <p className="text-dark-muted">Select your profile to continue</p>
                </div>

                {step === 'select' ? (
                    <div className="grid grid-cols-2 gap-4">
                        {staffList.map((staff) => (
                            <button
                                key={staff.id}
                                onClick={() => {
                                    setSelectedStaff(staff.id);
                                    setStep('pin');
                                }}
                                className="p-4 bg-dark-card border border-dark-border rounded-xl hover:border-accent transition-colors text-center"
                            >
                                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-dark-bg flex items-center justify-center font-bold text-lg">
                                    {staff.name.charAt(0)}
                                </div>
                                <span className="font-medium">{staff.name}</span>
                                <span className="block text-xs text-dark-muted mt-1">{staff.role}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                        <button
                            onClick={() => {
                                setStep('select');
                                setPin('');
                                setError('');
                            }}
                            className="text-sm text-dark-muted hover:text-white mb-4 flex items-center"
                        >
                            &larr; Back to list
                        </button>

                        <h2 className="text-lg font-bold mb-4 text-center">Enter PIN</h2>

                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-accent' : 'bg-dark-border'}`}
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm text-center mb-4">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setPin(prev => prev.length < 4 ? prev + num : prev)}
                                    className="h-14 rounded-lg bg-dark-bg hover:bg-dark-border font-bold text-xl transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => setPin(prev => prev.slice(0, -1))}
                                className="h-14 rounded-lg bg-dark-bg hover:bg-dark-border font-bold text-xl transition-colors text-red-400"
                            >
                                ⌫
                            </button>
                            <button
                                onClick={() => setPin(prev => prev.length < 4 ? prev + 0 : prev)}
                                className="h-14 rounded-lg bg-dark-bg hover:bg-dark-border font-bold text-xl transition-colors"
                            >
                                0
                            </button>
                            <button
                                onClick={handleLogin}
                                disabled={pin.length < 4 || loading}
                                className="h-14 rounded-lg bg-accent hover:bg-accent-hover font-bold text-xl transition-colors text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
