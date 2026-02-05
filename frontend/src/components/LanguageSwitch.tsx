'use client';

import { Globe } from 'lucide-react';
import { useApp } from '../app/providers';

const languages = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'ar', label: 'AR', flag: '🇲🇦' },
] as const;

export function LanguageSwitch() {
    const { locale, setLocale } = useApp();

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    const handleChange = () => {
        const currentIndex = languages.findIndex(l => l.code === locale);
        const nextIndex = (currentIndex + 1) % languages.length;
        setLocale(languages[nextIndex].code);
    };

    return (
        <button
            onClick={handleChange}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-light-card dark:bg-dark-card hover:bg-light-border dark:hover:bg-dark-border transition-colors"
            aria-label="Change language"
        >
            <span className="text-sm">{currentLang.flag}</span>
            <span className="text-sm font-medium">{currentLang.label}</span>
        </button>
    );
}
