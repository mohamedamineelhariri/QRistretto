import type { CapacitorConfig } from '@capacitor/cli';

// ADMIN APP - Opens directly to Admin Login
const config: CapacitorConfig = {
    appId: 'com.qristretto.admin',
    appName: 'QRistretto Admin',
    webDir: 'out',
    server: {
        androidScheme: 'http',
        // On emulator: 10.0.2.2, on real device: your local IP
        url: 'http://10.0.2.2:3000/admin',
        cleartext: true,
    },
};

export default config;
