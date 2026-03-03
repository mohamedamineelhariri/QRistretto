import type { CapacitorConfig } from '@capacitor/cli';

// STAFF APP - Opens directly to Staff Login
const config: CapacitorConfig = {
    appId: 'com.qristretto.staff',
    appName: 'QRistretto Staff',
    webDir: 'out',
    server: {
        androidScheme: 'http',
        // On emulator: 10.0.2.2, on real device: your local IP
        url: 'http://10.0.2.2:3000/staff/login',
        cleartext: true,
    },
};

export default config;
