import type { CapacitorConfig } from '@capacitor/cli';

// CUSTOMER APP - Opens to QR scan home page
const config: CapacitorConfig = {
    appId: 'com.qristretto.customer',
    appName: 'QRistretto',
    webDir: 'out',
    server: {
        androidScheme: 'http',
    },
};

export default config;
