'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Wifi, WifiOff, QrCode, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { useApp } from './providers';

export default function HomePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t, locale } = useApp();
    const setTableInfo = useCartStore(state => state.setTableInfo);

    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'wifi-required'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [tableInfo, setTableInfoState] = useState<{
        tableNumber: number;
        restaurantName: string;
    } | null>(null);

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            setErrorMessage(t('qr.invalid'));
            return;
        }

        validateToken(token);
    }, [token]);

    const validateToken = async (qrToken: string) => {
        try {
            const response = await api.validateToken(qrToken);

            if (response.success && response.data) {
                const { tableId, tableNumber, restaurantId, restaurant } = response.data;

                // Store table info
                setTableInfo(tableId, restaurantId, qrToken);

                // Get restaurant name based on locale
                let restaurantName = restaurant.name;
                if (locale === 'fr' && restaurant.nameFr) restaurantName = restaurant.nameFr;
                if (locale === 'ar' && restaurant.nameAr) restaurantName = restaurant.nameAr;

                setTableInfoState({ tableNumber, restaurantName });
                setStatus('valid');

                // Redirect to menu after short delay
                setTimeout(() => {
                    router.push('/menu');
                }, 1500);
            } else {
                setStatus('invalid');
                setErrorMessage(t('qr.expired'));
            }
        } catch (error: any) {
            if (error.message?.includes('WiFi') || error.code === 'WIFI_REQUIRED') {
                setStatus('wifi-required');
            } else {
                setStatus('invalid');
                setErrorMessage(t('qr.expired'));
            }
        }
    };

    const handleWifiRetry = () => {
        if (token) {
            setStatus('loading');
            validateToken(token);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">

                {/* Content Area */}
                <div className="min-h-[300px] flex flex-col items-center justify-center">
                    {/* 1. Loading State */}
                    {status === 'loading' && (
                        <div className="animate-fade-in">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                            </div>
                            <h1 className="text-xl font-semibold mb-2">{t('common.loading')}</h1>
                            <p className="text-light-muted dark:text-dark-muted">
                                Validating your table...
                            </p>
                        </div>
                    )}

                    {/* 2. Valid - Redirecting */}
                    {status === 'valid' && tableInfo && (
                        <div className="animate-slide-up">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent flex items-center justify-center">
                                <QrCode className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">{tableInfo.restaurantName}</h1>
                            <p className="text-lg text-accent font-medium mb-4">
                                {t('order.table')} {tableInfo.tableNumber}
                            </p>
                            <p className="text-light-muted dark:text-dark-muted font-medium animate-pulse">
                                Opening menu...
                            </p>
                        </div>
                    )}

                    {/* 3. WiFi Required (Highest priority error) */}
                    {status === 'wifi-required' && (
                        <div className="animate-fade-in">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                                <WifiOff className="w-10 h-10 text-amber-500" />
                            </div>
                            <h1 className="text-xl font-semibold mb-2">{t('wifi.required')}</h1>
                            <p className="text-light-muted dark:text-dark-muted mb-6 max-w-[250px]">
                                {t('wifi.message')}
                            </p>
                            <button
                                onClick={handleWifiRetry}
                                className="btn-primary w-full shadow-lg shadow-accent/20"
                            >
                                <Wifi className="w-5 h-5 mr-2" />
                                {t('wifi.button')}
                            </button>
                        </div>
                    )}

                    {/* 4. Invalid Token (Expired or wrong) */}
                    {status === 'invalid' && token && (
                        <div className="animate-fade-in">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                <X className="w-10 h-10 text-red-500" />
                            </div>
                            <h1 className="text-xl font-semibold mb-2">{t('qr.invalid')}</h1>
                            <p className="text-light-muted dark:text-dark-muted mb-6">
                                {errorMessage}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-secondary"
                            >
                                {t('common.retry')}
                            </button>
                        </div>
                    )}

                    {/* 5. No Token (Instruction state) */}
                    {status === 'invalid' && !token && (
                        <div className="animate-fade-in">
                            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-light-border dark:bg-dark-border flex items-center justify-center rotate-3 border-4 border-white dark:border-dark-bg shadow-xl">
                                <QrCode className="w-12 h-12 text-light-muted dark:text-dark-muted" />
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t('qr.scan')}</h1>
                            <p className="text-light-muted dark:text-dark-muted leading-relaxed">
                                Scan the QR code on your table to view the menu and place your order.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}
