'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    QrCode,
    RefreshCw,
    Download,
    Loader2,
    Grid3X3,
    X
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '../../providers';

interface Table {
    id: string;
    tableNumber: number;
    tableName: string | null;
    capacity: number;
    active: boolean;
    qrCodes: Array<{
        id: string;
        qrDataUrl: string;
        qrUrl: string;
        expiresAt: string;
        active: boolean;
    }>;
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const expiry = new Date(expiresAt).getTime();
            const now = new Date().getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                clearInterval(interval);
                onExpire();
                return;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpire]);

    return (
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${timeLeft === 'Expired' ? 'bg-red-100 text-red-600' : 'bg-accent/10 text-accent'
            }`}>
            {timeLeft}
        </span>
    );
}

import { socketClient } from '@/lib/socket';

export default function AdminTablesPage() {
    const router = useRouter();
    const { t, isRTL } = useApp();

    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState<{ table: Table; qrData: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [form, setForm] = useState({
        tableNumber: '',
        tableName: '',
        capacity: '4',
    });

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        api.setToken(token);
        fetchTables();

        // Socket listeners for real-time updates
        socketClient.connect();

        const cleanup1 = socketClient.onTableUpdated(({ tableId }) => {
            console.log(`[Socket] Table ${tableId} updated, refreshing...`);
            fetchTables();
        });

        const cleanup2 = socketClient.onQRRefreshed(() => {
            fetchTables();
        });

        return () => {
            cleanup1?.();
            cleanup2?.();
        };
    }, []);

    const fetchTables = async () => {
        try {
            const response = await api.getTables();
            if (response.success && response.data) {
                setTables(response.data.tables as Table[]);
            }
        } catch (error) {
            console.error('Failed to fetch tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.tableNumber) {
            alert('Table number is required');
            return;
        }

        setSaving(true);
        try {
            const response = await api.createTable({
                tableNumber: parseInt(form.tableNumber),
                tableName: form.tableName || undefined,
                capacity: parseInt(form.capacity),
            });

            if (response.success) {
                fetchTables();
                setShowModal(false);
                setForm({ tableNumber: '', tableName: '', capacity: '4' });
            }
        } catch (error) {
            console.error('Failed to create table:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateQR = async (tableId: string) => {
        try {
            const response = await api.generateQR(tableId);
            if (response.success && response.data) {
                fetchTables();
                const table = tables.find(t => t.id === tableId);
                if (table) {
                    setShowQRModal({
                        table,
                        qrData: response.data.qrDataUrl
                    });
                }
            }
        } catch (error) {
            console.error('Failed to generate QR:', error);
        }
    };

    const handleRefreshAll = async () => {
        if (!confirm('This will generate new QR codes for all tables. Old QR codes will stop working. Continue?')) {
            return;
        }

        setRefreshing(true);
        try {
            await api.refreshAllQR();
            fetchTables();
        } catch (error) {
            console.error('Failed to refresh QR codes:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const downloadQR = (dataUrl: string, tableNumber: number) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `table-${tableNumber}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getLatestQR = (table: Table) => {
        if (!table.qrCodes || table.qrCodes.length === 0) return null;
        return table.qrCodes[0];
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
                        <h1 className="text-xl font-bold">{t('admin.tables')}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefreshAll}
                            disabled={refreshing}
                            className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            title="Refresh all QR codes"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-2 rounded-full bg-accent text-white"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Tables Grid */}
            <main className="p-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent" />
                    </div>
                ) : tables.length === 0 ? (
                    <div className="text-center py-12">
                        <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-light-muted opacity-50" />
                        <p className="text-light-muted">No tables yet</p>
                        <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                            <Plus className="w-5 h-5 mr-2" />
                            Add First Table
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {tables.map((table) => {
                            const latestQR = getLatestQR(table);
                            const hasRealToken = latestQR && latestQR.id !== 'stable';
                            const isExpired = latestQR && !latestQR.active;

                            return (
                                <div key={table.id} className="card p-4 text-center">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
                                        <span className="text-xl font-bold text-accent">{table.tableNumber}</span>
                                    </div>
                                    <h3 className="font-medium">Table {table.tableNumber}</h3>
                                    {table.tableName && (
                                        <p className="text-sm text-light-muted dark:text-dark-muted">{table.tableName}</p>
                                    )}
                                    <div className="flex items-center justify-center gap-2 mt-1 mb-3">
                                        <p className="text-xs text-light-muted dark:text-dark-muted">
                                            Cap: {table.capacity}
                                        </p>
                                        {hasRealToken && (
                                            <CountdownTimer
                                                expiresAt={latestQR.expiresAt}
                                                onExpire={() => { }}
                                            />
                                        )}
                                        {latestQR && latestQR.id === 'stable' && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-light-border dark:bg-dark-border text-light-muted">
                                                Ready
                                            </span>
                                        )}
                                    </div>

                                    {latestQR ? (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setShowQRModal({
                                                    table,
                                                    qrData: latestQR.qrDataUrl
                                                })}
                                                className="btn-secondary w-full text-sm py-2"
                                            >
                                                <QrCode className="w-4 h-4 mr-1" />
                                                View QR
                                            </button>
                                            {isExpired && hasRealToken && (
                                                <p className="text-[10px] text-red-500 font-medium">
                                                    Session Expired
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleGenerateQR(table.id)}
                                            className="btn-primary w-full text-sm py-2"
                                        >
                                            <QrCode className="w-4 h-4 mr-1" />
                                            Generate QR
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Add Table Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-sm bg-light-bg dark:bg-dark-bg rounded-t-2xl sm:rounded-2xl">
                        <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                            <h2 className="text-lg font-bold">Add Table</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Table Number *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.tableNumber}
                                    onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Name (optional)</label>
                                <input
                                    type="text"
                                    value={form.tableName}
                                    onChange={(e) => setForm({ ...form, tableName: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Window Seat"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={form.capacity}
                                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                    className="input"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-light-border dark:border-dark-border flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleCreate} disabled={saving} className="flex-1 btn-primary">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-sm bg-light-bg dark:bg-dark-bg rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                            <h2 className="text-lg font-bold">Table {showQRModal.table.tableNumber} QR</h2>
                            <button
                                onClick={() => setShowQRModal(null)}
                                className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center">
                            <div className="bg-white p-4 rounded-xl mb-4">
                                <img
                                    src={showQRModal.qrData}
                                    alt={`QR Code for Table ${showQRModal.table.tableNumber}`}
                                    className="w-48 h-48"
                                />
                            </div>
                            <p className="text-sm text-light-muted dark:text-dark-muted mb-4 text-center">
                                Print this QR code and place it on Table {showQRModal.table.tableNumber}
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => downloadQR(showQRModal.qrData, showQRModal.table.tableNumber)}
                                    className="flex-1 btn-primary"
                                >
                                    <Download className="w-5 h-5 mr-2" />
                                    Download
                                </button>
                                <button
                                    onClick={() => handleGenerateQR(showQRModal.table.id)}
                                    className="btn-secondary"
                                    title="Regenerate QR"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
