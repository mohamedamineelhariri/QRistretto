/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Light Mode - Soft, warm palette
                light: {
                    bg: '#FAFAF9',
                    card: '#FFFFFF',
                    text: '#1C1917',
                    muted: '#78716C',
                    border: '#E7E5E4',
                },
                // Dark Mode - Muted, elegant
                dark: {
                    bg: '#1C1917',
                    card: '#292524',
                    text: '#FAFAF9',
                    muted: '#A8A29E',
                    border: '#44403C',
                },
                // Accent - Soft emerald
                accent: {
                    DEFAULT: '#059669',
                    light: '#D1FAE5',
                    dark: '#064E3B',
                    hover: '#047857',
                },
                // Status colors (muted)
                status: {
                    pending: '#F59E0B',
                    accepted: '#3B82F6',
                    preparing: '#8B5CF6',
                    ready: '#10B981',
                    delivered: '#6B7280',
                    cancelled: '#EF4444',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                arabic: ['Noto Sans Arabic', 'sans-serif'],
            },
            fontSize: {
                // Mobile-optimized sizes
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                'lg': '0.75rem',
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
                'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
                'strong': '0 8px 32px rgba(0, 0, 0, 0.12)',
            },
            spacing: {
                // Touch-friendly minimum sizes
                'touch': '48px',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
            },
        },
    },
    plugins: [],
}
