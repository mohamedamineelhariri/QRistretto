'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Locale = 'en' | 'fr' | 'ar';

interface AppContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
    isRTL: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Translations
const translations: Record<Locale, Record<string, string>> = {
    en: {
        // Common
        'app.name': 'QR Café',
        'common.loading': 'Loading...',
        'common.error': 'Something went wrong',
        'common.retry': 'Retry',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.close': 'Close',
        'common.back': 'Back',

        // Menu
        'menu.title': 'Menu',
        'menu.search': 'Search menu...',
        'menu.empty': 'No items available',
        'menu.addToCart': 'Add to cart',

        // Cart
        'cart.title': 'Your Order',
        'cart.empty': 'Your cart is empty',
        'cart.total': 'Total',
        'cart.placeOrder': 'Place Order',
        'cart.items': 'items',
        'cart.notes': 'Special instructions',

        // Order
        'order.title': 'Order Status',
        'order.number': 'Order #',
        'order.table': 'Table',
        'order.pending': 'Waiting for confirmation',
        'order.accepted': 'Order confirmed',
        'order.preparing': 'Preparing your order',
        'order.ready': 'Ready for pickup',
        'order.delivered': 'Delivered',
        'order.cancelled': 'Cancelled',
        'order.success': 'Order placed successfully!',
        'order.track': 'Track your order',

        // WiFi
        'wifi.required': 'WiFi Connection Required',
        'wifi.message': 'Please connect to the restaurant WiFi to place your order.',
        'wifi.button': 'I\'m Connected',

        // QR
        'qr.invalid': 'Invalid QR Code',
        'qr.expired': 'This QR code has expired. Please ask staff for a new one.',
        'qr.scan': 'Scan QR to Order',

        // Staff
        'staff.kitchen': 'Kitchen',
        'staff.waiter': 'Waiter',
        'staff.orders': 'Orders',
        'staff.noOrders': 'No pending orders',
        'staff.accept': 'Accept',
        'staff.prepare': 'Start Preparing',
        'staff.ready': 'Mark Ready',
        'staff.deliver': 'Mark Delivered',

        // Admin
        'admin.title': 'Admin Panel',
        'admin.login': 'Login',
        'admin.logout': 'Logout',
        'admin.dashboard': 'Dashboard',
        'admin.menu': 'Menu Items',
        'admin.tables': 'Tables',
        'admin.orders': 'Orders',
        'admin.settings': 'Settings',
        'admin.staff': 'Staff',
    },
    fr: {
        // Common
        'app.name': 'QR Café',
        'common.loading': 'Chargement...',
        'common.error': 'Une erreur est survenue',
        'common.retry': 'Réessayer',
        'common.cancel': 'Annuler',
        'common.confirm': 'Confirmer',
        'common.save': 'Enregistrer',
        'common.delete': 'Supprimer',
        'common.edit': 'Modifier',
        'common.add': 'Ajouter',
        'common.close': 'Fermer',
        'common.back': 'Retour',

        // Menu
        'menu.title': 'Menu',
        'menu.search': 'Rechercher...',
        'menu.empty': 'Aucun article disponible',
        'menu.addToCart': 'Ajouter au panier',

        // Cart
        'cart.title': 'Votre Commande',
        'cart.empty': 'Votre panier est vide',
        'cart.total': 'Total',
        'cart.placeOrder': 'Commander',
        'cart.items': 'articles',
        'cart.notes': 'Instructions spéciales',

        // Order
        'order.title': 'Statut de la Commande',
        'order.number': 'Commande #',
        'order.table': 'Table',
        'order.pending': 'En attente de confirmation',
        'order.accepted': 'Commande confirmée',
        'order.preparing': 'En préparation',
        'order.ready': 'Prête',
        'order.delivered': 'Livrée',
        'order.cancelled': 'Annulée',
        'order.success': 'Commande passée avec succès!',
        'order.track': 'Suivre votre commande',

        // WiFi
        'wifi.required': 'Connexion WiFi Requise',
        'wifi.message': 'Veuillez vous connecter au WiFi du restaurant pour commander.',
        'wifi.button': 'Je suis connecté',

        // QR
        'qr.invalid': 'Code QR Invalide',
        'qr.expired': 'Ce code QR a expiré. Demandez-en un nouveau au personnel.',
        'qr.scan': 'Scannez pour Commander',

        // Staff
        'staff.kitchen': 'Cuisine',
        'staff.waiter': 'Serveur',
        'staff.orders': 'Commandes',
        'staff.noOrders': 'Aucune commande en attente',
        'staff.accept': 'Accepter',
        'staff.prepare': 'Commencer',
        'staff.ready': 'Prête',
        'staff.deliver': 'Livrée',

        // Admin
        'admin.title': 'Administration',
        'admin.login': 'Connexion',
        'admin.logout': 'Déconnexion',
        'admin.dashboard': 'Tableau de bord',
        'admin.menu': 'Menu',
        'admin.tables': 'Tables',
        'admin.orders': 'Commandes',
        'admin.settings': 'Paramètres',
        'admin.staff': 'Personnel',
    },
    ar: {
        // Common
        'app.name': 'مقهى QR',
        'common.loading': 'جاري التحميل...',
        'common.error': 'حدث خطأ ما',
        'common.retry': 'إعادة المحاولة',
        'common.cancel': 'إلغاء',
        'common.confirm': 'تأكيد',
        'common.save': 'حفظ',
        'common.delete': 'حذف',
        'common.edit': 'تعديل',
        'common.add': 'إضافة',
        'common.close': 'إغلاق',
        'common.back': 'رجوع',

        // Menu
        'menu.title': 'القائمة',
        'menu.search': 'ابحث في القائمة...',
        'menu.empty': 'لا توجد عناصر متاحة',
        'menu.addToCart': 'أضف للسلة',

        // Cart
        'cart.title': 'طلبك',
        'cart.empty': 'سلتك فارغة',
        'cart.total': 'المجموع',
        'cart.placeOrder': 'تأكيد الطلب',
        'cart.items': 'عناصر',
        'cart.notes': 'تعليمات خاصة',

        // Order
        'order.title': 'حالة الطلب',
        'order.number': 'رقم الطلب',
        'order.table': 'الطاولة',
        'order.pending': 'في انتظار التأكيد',
        'order.accepted': 'تم تأكيد الطلب',
        'order.preparing': 'جاري التحضير',
        'order.ready': 'جاهز للاستلام',
        'order.delivered': 'تم التوصيل',
        'order.cancelled': 'ملغي',
        'order.success': 'تم تقديم الطلب بنجاح!',
        'order.track': 'تتبع طلبك',

        // WiFi
        'wifi.required': 'اتصال WiFi مطلوب',
        'wifi.message': 'يرجى الاتصال بشبكة WiFi الخاصة بالمطعم لتقديم طلبك.',
        'wifi.button': 'أنا متصل',

        // QR
        'qr.invalid': 'رمز QR غير صالح',
        'qr.expired': 'انتهت صلاحية رمز QR. يرجى طلب رمز جديد من الموظف.',
        'qr.scan': 'امسح للطلب',

        // Staff
        'staff.kitchen': 'المطبخ',
        'staff.waiter': 'النادل',
        'staff.orders': 'الطلبات',
        'staff.noOrders': 'لا توجد طلبات معلقة',
        'staff.accept': 'قبول',
        'staff.prepare': 'بدء التحضير',
        'staff.ready': 'جاهز',
        'staff.deliver': 'تم التوصيل',

        // Admin
        'admin.title': 'لوحة التحكم',
        'admin.login': 'تسجيل الدخول',
        'admin.logout': 'تسجيل الخروج',
        'admin.dashboard': 'لوحة القيادة',
        'admin.menu': 'القائمة',
        'admin.tables': 'الطاولات',
        'admin.orders': 'الطلبات',
        'admin.settings': 'الإعدادات',
        'admin.staff': 'الموظفين',
    },
};

export function Providers({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [locale, setLocale] = useState<Locale>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Load saved preferences
        const savedTheme = localStorage.getItem('theme') as Theme;
        const savedLocale = localStorage.getItem('locale') as Locale;

        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }

        if (savedLocale) {
            setLocale(savedLocale);
        } else {
            // Auto-detect browser language
            const browserLang = navigator.language.split('-')[0];
            if (browserLang === 'fr') setLocale('fr');
            else if (browserLang === 'ar') setLocale('ar');
        }
    }, []);

    useEffect(() => {
        if (mounted) {
            // Update HTML attributes
            document.documentElement.classList.toggle('dark', theme === 'dark');
            document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
            document.documentElement.setAttribute('lang', locale);

            // Save preferences
            localStorage.setItem('theme', theme);
            localStorage.setItem('locale', locale);
        }
    }, [theme, locale, mounted]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const t = (key: string): string => {
        return translations[locale][key] || key;
    };

    const isRTL = locale === 'ar';

    if (!mounted) {
        return null;
    }

    return (
        <AppContext.Provider value={{
            theme,
            setTheme,
            toggleTheme,
            locale,
            setLocale,
            t,
            isRTL
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within Providers');
    }
    return context;
}
