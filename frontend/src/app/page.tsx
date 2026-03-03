'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Wifi, WifiOff, QrCode, X, Camera, ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { useApp } from './providers';

// Capacitor / BarcodeScanner — only loaded on native
let BarcodeScanner: any = null;
if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
    import('@capacitor-community/barcode-scanner').then((m) => {
        BarcodeScanner = m.BarcodeScanner;
    });
}

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
    const [isScanning, setIsScanning] = useState(false);

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

                setTableInfo(tableId, restaurantId, qrToken);

                let restaurantName = restaurant.name;
                if (locale === 'fr' && restaurant.nameFr) restaurantName = restaurant.nameFr;
                if (locale === 'ar' && restaurant.nameAr) restaurantName = restaurant.nameAr;

                setTableInfoState({ tableNumber, restaurantName });
                setStatus('valid');

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

    const startScan = useCallback(async () => {
        if (!BarcodeScanner) {
            alert('QR scanning is only available on Android. Use the browser on a PC.');
            return;
        }

        try {
            // Check / request camera permission
            const status = await BarcodeScanner.checkPermission({ force: true });
            if (!status.granted) {
                alert('Camera permission is required to scan QR codes.');
                return;
            }

            setIsScanning(true);
            document.body.classList.add('qr-scanning');

            const result = await BarcodeScanner.startScan();

            document.body.classList.remove('qr-scanning');
            setIsScanning(false);

            if (result.hasContent) {
                const scannedValue = result.content;
                console.log('📸 [SCAN] Content detected:', scannedValue);

                let extractedToken = '';
                let extractedTableId = '';

                // 1. Check for legacy ?token= format
                try {
                    const url = new URL(scannedValue);
                    const urlToken = url.searchParams.get('token');
                    if (urlToken) {
                        extractedToken = urlToken;
                    }
                    // 2. Check for dynamic /api/qr/scan/TABLE_ID format
                    else if (url.pathname.includes('/api/qr/scan/')) {
                        const parts = url.pathname.split('/');
                        extractedTableId = parts[parts.length - 1];
                    }
                } catch (_) {
                    // Not a valid URL, treat as direct token
                    extractedToken = scannedValue;
                }

                setStatus('loading');

                // 3. Resolve or Validate
                if (extractedTableId) {
                    console.log('🔄 [SCAN] Resolving tableId:', extractedTableId);
                    try {
                        const res = await api.resolveScan(extractedTableId);
                        if (res.success && res.data?.token) {
                            validateToken(res.data.token);
                        } else {
                            throw new Error('Could not resolve table');
                        }
                    } catch (e) {
                        setStatus('invalid');
                        setErrorMessage(t('qr.invalid'));
                    }
                } else if (extractedToken) {
                    console.log('✅ [SCAN] Using token directly:', extractedToken);
                    validateToken(extractedToken);
                } else {
                    setStatus('invalid');
                    setErrorMessage(t('qr.invalid'));
                }
            }
        } catch (err) {
            document.body.classList.remove('qr-scanning');
            setIsScanning(false);
            console.error('Scan error:', err);
        }
    }, []);

    const stopScan = useCallback(async () => {
        if (BarcodeScanner) {
            await BarcodeScanner.stopScan();
        }
        document.body.classList.remove('qr-scanning');
        setIsScanning(false);
    }, []);

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            {/* QR Scanning Overlay */}
            {isScanning && (
                <div id="qr-scanner-ui" className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto flex flex-col items-center justify-center w-full h-full">
                        <div className="relative w-64 h-64 mb-8">
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent rounded-tl-sm" />
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent rounded-tr-sm" />
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent rounded-bl-sm" />
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent rounded-br-sm" />
                            {/* Scanning line animation */}
                            <div className="absolute inset-x-2 top-1/2 h-0.5 bg-accent opacity-80 animate-pulse" />
                        </div>
                        <p className="text-white text-lg font-medium mb-2 drop-shadow-lg">Point at the QR code</p>
                        <p className="text-white/80 text-sm mb-8 drop-shadow-lg">on your table</p>
                        <button
                            onClick={stopScan}
                            className="flex items-center gap-2 bg-black/40 backdrop-blur-md text-white px-6 py-3 rounded-full font-medium border border-white/20 active:scale-95 transition-transform"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

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

                    {/* 3. WiFi Required */}
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

                    {/* 5. No Token — Main landing with Scan button */}
                    {status === 'invalid' && !token && (
                        <div className="animate-fade-in">
                            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-light-border dark:bg-dark-border flex items-center justify-center rotate-3 border-4 border-white dark:border-dark-bg shadow-xl">
                                <QrCode className="w-12 h-12 text-light-muted dark:text-dark-muted" />
                            </div>
                            <h1 className="text-2xl font-bold mb-3">{t('qr.scan')}</h1>
                            <p className="text-light-muted dark:text-dark-muted leading-relaxed mb-8">
                                Scan the QR code on your table to view the menu and place your order.
                            </p>

                            {/* Native QR Scan Button — only shown in the Android app */}
                            {isNative && (
                                <button
                                    onClick={startScan}
                                    className="btn-primary w-full flex items-center justify-center gap-3 shadow-lg shadow-accent/25 mb-3"
                                >
                                    <Camera className="w-5 h-5" />
                                    Scan QR Code
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Test / Debug Portals */}
                <div className="mt-12 pt-8 border-t border-light-border dark:border-dark-border opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-xs font-medium uppercase tracking-wider text-light-muted dark:text-dark-muted mb-4">
                        Test / Debug Portals
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => router.push('/admin')}
                            className="btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                        >
                            Admin Portal
                        </button>
                        <button
                            onClick={() => router.push('/staff/login')}
                            className="btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                        >
                            Staff Portal
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
